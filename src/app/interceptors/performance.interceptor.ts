import { Injectable, inject } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { ToastService } from '../services/toast.service';
import { environment } from '../../environments/environment';

export interface ApiCallMetrics {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status?: number;
  responseSize?: number;
  error?: any;
}

@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  
  private logger = inject(LoggerService);
  private toastService = inject(ToastService);
  
  private readonly SLOW_REQUEST_THRESHOLD = 3000; // 3 seconds
  private readonly ERROR_RETRY_THRESHOLD = 3; // Number of consecutive errors before showing toast
  private errorCount = 0;
  private ongoingRequests = new Map<string, ApiCallMetrics>();

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!environment.enablePerformanceMonitoring) {
      return next.handle(request);
    }

    const requestId = this.generateRequestId();
    const startTime = performance.now();
    
    const metrics: ApiCallMetrics = {
      url: this.sanitizeUrl(request.url),
      method: request.method,
      startTime,
    };
    
    this.ongoingRequests.set(requestId, metrics);
    
    this.logger.debug('API Request started', {
      method: request.method,
      url: this.sanitizeUrl(request.url),
      requestId
    }, 'PerformanceInterceptor');

    return next.handle(request).pipe(
      tap((event: HttpEvent<unknown>) => {
        if (event instanceof HttpResponse) {
          this.handleSuccessResponse(requestId, event, metrics);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleErrorResponse(requestId, error, metrics);
        return throwError(() => error);
      }),
      finalize(() => {
        this.ongoingRequests.delete(requestId);
      })
    );
  }

  private handleSuccessResponse(requestId: string, response: HttpResponse<any>, metrics: ApiCallMetrics): void {
    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.status = response.status;
    metrics.responseSize = this.calculateResponseSize(response.body);
    
    // Reset error count on successful request
    this.errorCount = 0;
    
    this.logger.logApiCall(
      metrics.method,
      metrics.url,
      duration,
      metrics.status,
      metrics.responseSize || 0
    );

    // Log slow requests
    if (duration > this.SLOW_REQUEST_THRESHOLD) {
      this.logger.warn('Slow API request detected', {
        ...metrics,
        threshold: this.SLOW_REQUEST_THRESHOLD
      }, 'PerformanceInterceptor');

      // Show toast for very slow requests (> 5 seconds)
      if (duration > 5000) {
        this.toastService.warning(
          `Request took ${Math.round(duration / 1000)} seconds to complete. Please check your connection.`,
          'Slow Response'
        );
      }
    }

    this.logger.debug('API Request completed successfully', {
      ...metrics,
      requestId
    }, 'PerformanceInterceptor');
  }

  private handleErrorResponse(requestId: string, error: HttpErrorResponse, metrics: ApiCallMetrics): void {
    const endTime = performance.now();
    const duration = endTime - metrics.startTime;
    
    metrics.endTime = endTime;
    metrics.duration = duration;
    metrics.status = error.status;
    metrics.error = this.sanitizeErrorData(error);
    
    this.errorCount++;
    
    this.logger.error('API Request failed', {
      ...metrics,
      error: {
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        url: this.sanitizeUrl(error.url || metrics.url)
      },
      requestId
    }, 'PerformanceInterceptor');

    // Show user-friendly error messages
    this.showUserFriendlyError(error, metrics);
  }

  private showUserFriendlyError(error: HttpErrorResponse, metrics: ApiCallMetrics): void {
    const errorMessage = this.getErrorMessage(error);
    const errorTitle = this.getErrorTitle(error);

    switch (error.status) {
      case 0:
        // Network error
        this.toastService.networkError();
        break;
        
      case 400:
        this.toastService.validationError(errorMessage, errorTitle);
        break;
        
      case 401:
        this.toastService.permissionError('Please log in again to continue.', 'Session Expired');
        break;
        
      case 403:
        this.toastService.permissionError(errorMessage, errorTitle);
        break;
        
      case 404:
        this.toastService.error('The requested resource was not found.', 'Not Found');
        break;
        
      case 408:
        this.toastService.error('The request timed out. Please try again.', 'Request Timeout');
        break;
        
      case 429:
        this.toastService.warning('Too many requests. Please wait a moment before trying again.', 'Rate Limited');
        break;
        
      case 500:
      case 502:
      case 503:
      case 504:
        // Show retry option for server errors
        this.toastService.apiError(
          'A server error occurred. Please try again.',
          'Server Error',
          () => {
            // Retry logic could be implemented here
            this.toastService.info('Please refresh the page to try again.');
          }
        );
        break;
        
      default:
        // Show generic error for other status codes
        if (this.errorCount >= this.ERROR_RETRY_THRESHOLD) {
          this.toastService.apiError(
            errorMessage || 'An unexpected error occurred. Please try again.',
            errorTitle
          );
        }
        break;
    }
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.error?.message) {
      return error.error.message;
    }
    if (error.error?.error) {
      return error.error.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }

  private getErrorTitle(error: HttpErrorResponse): string {
    switch (error.status) {
      case 400:
        return 'Invalid Request';
      case 401:
        return 'Unauthorized';
      case 403:
        return 'Forbidden';
      case 404:
        return 'Not Found';
      case 408:
        return 'Timeout';
      case 429:
        return 'Too Many Requests';
      case 500:
        return 'Server Error';
      case 502:
        return 'Bad Gateway';
      case 503:
        return 'Service Unavailable';
      case 504:
        return 'Gateway Timeout';
      default:
        return 'Error';
    }
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'password', 'key', 'secret', 'auth'];
      sensitiveParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.set(param, '[REDACTED]');
        }
      });
      return urlObj.toString();
    } catch {
      return url; // Return original if URL parsing fails
    }
  }

  private sanitizeErrorData(error: HttpErrorResponse): any {
    const sanitized = {
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      url: this.sanitizeUrl(error.url || ''),
    };

    // Don't include full error body for security reasons
    if (error.error && typeof error.error === 'object') {
      sanitized['errorType'] = error.error.constructor?.name || 'Unknown';
      if (error.error.message) {
        sanitized['errorMessage'] = error.error.message;
      }
    }

    return sanitized;
  }

  private calculateResponseSize(responseBody: any): number {
    if (!responseBody) return 0;
    
    try {
      return JSON.stringify(responseBody).length;
    } catch {
      return 0;
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    ongoingRequests: number;
    averageResponseTime?: number;
    errorRate?: number;
  } {
    return {
      ongoingRequests: this.ongoingRequests.size,
      // Additional metrics could be calculated here
    };
  }

  /**
   * Clear error count (useful for testing or manual reset)
   */
  resetErrorCount(): void {
    this.errorCount = 0;
  }
}