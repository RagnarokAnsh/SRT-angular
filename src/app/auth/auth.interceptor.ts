import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get the auth token from localStorage
    const token = localStorage.getItem('token');

    // Clone the request and add the authorization header if token exists and is valid
    let authReq = req;
    if (token && this.userService.isAuthenticated()) {
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    // Handle the request and catch any authentication/authorization errors
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
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
        
        return throwError(() => error);
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
  return (req: HttpRequest<unknown>, next: any) => {
    const token = localStorage.getItem('token');
    
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