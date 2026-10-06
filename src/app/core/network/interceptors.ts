import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { InjectionToken, inject } from '@angular/core';
import { catchError, finalize, throwError, timeout } from 'rxjs';

import { environment } from '@env';

import { API_BASE_URL } from '../api/api-base-url';
import { AuthApi } from '../api/auth-api';
import { AuthService } from '../auth/auth';
import { SessionStore } from '../auth/session';
import { LoadingTracker } from './loading-tracker';

export const REQUEST_TIMEOUT_MS = new InjectionToken<number>('REQUEST_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => environment.requestTimeoutMs,
});

function isApiRequest(url: string, base: string): boolean {
  return url === base || url.startsWith(`${base}/`);
}

/**
 * API requests only: adds the bearer token and `Accept: application/json`, and gives up
 * after the configured timeout instead of hanging forever.
 */
export const apiRequestInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (!isApiRequest(req.url, base)) return next(req);
  const token = inject(SessionStore).token();
  let headers = req.headers.set('Accept', 'application/json');
  if (token) headers = headers.set('Authorization', `Bearer ${token}`);
  return next(req.clone({ headers })).pipe(timeout({ each: inject(REQUEST_TIMEOUT_MS) }));
};

/** Drives the top progress bar. */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiRequest(req.url, inject(API_BASE_URL))) return next(req);
  const tracker = inject(LoadingTracker);
  tracker.start();
  return next(req).pipe(finalize(() => tracker.stop()));
};

/**
 * A 401 on any API call except login means the session has ended on the server:
 * sign out and send the user to the login page (once, even if several calls fail).
 */
export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(API_BASE_URL);
  if (!isApiRequest(req.url, base)) return next(req);
  const authApi = inject(AuthApi);
  const auth = inject(AuthService);
  const session = inject(SessionStore);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        !authApi.isLoginRequest(req.url) &&
        session.isAuthenticated()
      ) {
        auth.logout('expired');
      }
      return throwError(() => error);
    }),
  );
};
