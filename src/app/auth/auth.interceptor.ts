import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';
import { SecurityService } from '../core/security/security.service';
import { ErrorHandlerService } from '../core/error/error-handler.service';
import { inject } from '@angular/core';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private userService: UserService,
    private router: Router,
    private securityService: SecurityService,
    private errorHandler: ErrorHandlerService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip token for login and public endpoints
    if (this.isPublicEndpoint(req.url)) {
      return next.handle(req);
    }

    // Get the auth token securely
    const token = this.securityService.getToken();

    // Clone the request and add the authorization header if token exists and is valid
    let authReq = req;
    if (token && this.securityService.isTokenValid(token)) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    // Handle the request and catch any authentication/authorization errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check if token is expiring soon and try to refresh
        if (error.status === 401 && this.securityService.isTokenExpiringSoon()) {
          return this.handleTokenRefresh(req, next);
        }
        
        if (error.status === 401) {
          // Token expired or invalid, force logout
          console.warn('Authentication failed - token expired or invalid');
          this.handleAuthenticationError();
        } else if (error.status === 403) {
          // User authenticated but doesn't have permission
          console.warn('Access forbidden - insufficient permissions');
          this.handleAuthorizationError();
        } else if (error.status === 0) {
          // Network error or CORS issue
          console.error('Network error - please check your connection');
        }
        
        return this.errorHandler.handleHttpError(error, 'auth_interceptor');
      })
    );
  }

  // Check if endpoint is public (no auth required)
  private isPublicEndpoint(url: string): boolean {
    const publicEndpoints = [
      '/login',
      '/register',
      '/forgot-password',
      '/reset-password',
      '/health',
      '/api/health'
    ];
    
    return publicEndpoints.some(endpoint => url.includes(endpoint));
  }

  // Handle token refresh
  private handleTokenRefresh(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.securityService.refreshToken().pipe(
      switchMap(newToken => {
        // Retry the original request with new token
        const newReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });
        return next.handle(newReq);
      }),
      catchError(refreshError => {
        // If refresh fails, logout user
        this.handleAuthenticationError();
        return throwError(() => refreshError);
      })
    );
  }

  private handleAuthenticationError(): void {
    // Clear any existing tokens and user data
    this.userService.logout();
    
    // Redirect to login with return URL
    const currentUrl = this.router.url;
    this.router.navigate(['/login'], { 
      queryParams: { returnUrl: currentUrl },
      replaceUrl: true 
    });
  }

  private handleAuthorizationError(): void {
    // User is authenticated but doesn't have permission
    // Redirect to unauthorized page or user's dashboard
    if (this.userService.isAuthenticated()) {
      this.router.navigate(['/unauthorized'], { replaceUrl: true });
    } else {
      this.handleAuthenticationError();
    }
  }
}

// Enhanced functional interceptor for Angular 19+ (alternative approach)
export function createAuthInterceptor(userService: UserService, router: Router) {
  const securityService = inject(SecurityService);
  return (req: HttpRequest<unknown>, next: any) => {
    const token = securityService.getToken();
    // Add authorization header if token exists and is valid
    let authReq = req;
    if (token && userService.isAuthenticated()) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }
    
    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.warn('Authentication failed - token expired or invalid');
          userService.logout();
          const currentUrl = router.url;
          router.navigate(['/login'], { 
            queryParams: { returnUrl: currentUrl },
            replaceUrl: true 
          });
        } else if (error.status === 403) {
          console.warn('Access forbidden - insufficient permissions');
          if (userService.isAuthenticated()) {
            router.navigate(['/unauthorized'], { replaceUrl: true });
          } else {
            userService.logout();
            router.navigate(['/login'], { replaceUrl: true });
          }
        }
        
        return throwError(() => error);
      })
    );
  };
}