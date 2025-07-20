import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { LoggerService } from '../services/logger.service';
import { StateManagementService } from '../services/state-management.service';

@Injectable()
export class PerformanceInterceptor implements HttpInterceptor {
  private readonly slowRequestThreshold = 2000; // 2 seconds
  private readonly verySlowRequestThreshold = 5000; // 5 seconds

  constructor(
    private logger: LoggerService,
    private stateService: StateManagementService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const startTime = performance.now();
    const requestId = this.generateRequestId();
    
    // Log request start
    this.logger.debug(`API Request Started: ${req.method} ${req.url}`, {
      requestId,
      method: req.method,
      url: req.url,
      headers: this.sanitizeHeaders(req.headers),
      body: this.sanitizeBody(req.body)
    }, 'PerformanceInterceptor');

    return next.handle(req).pipe(
      tap({
        next: (event) => {
          if (event instanceof HttpResponse) {
            this.handleResponse(event, req, startTime, requestId);
          }
        },
        error: (error) => {
          if (error instanceof HttpErrorResponse) {
            this.handleError(error, req, startTime, requestId);
          }
        }
      }),
      finalize(() => {
        // This runs regardless of success or error
        const duration = performance.now() - startTime;
        this.logger.debug(`API Request Completed: ${req.method} ${req.url}`, {
          requestId,
          duration: Math.round(duration)
        }, 'PerformanceInterceptor');
      })
    );
  }

  private handleResponse(response: HttpResponse<any>, request: HttpRequest<any>, startTime: number, requestId: string): void {
    const endTime = performance.now();
    const duration = endTime - startTime;
    const responseSize = this.estimateResponseSize(response);

    // Create API metric
    const apiMetric = {
      endpoint: this.sanitizeUrl(request.url),
      method: request.method,
      duration: Math.round(duration),
      status: response.status,
      timestamp: new Date()
    };

    // Add to state management
    this.stateService.addApiMetric(apiMetric);

    // Log based on performance
    if (duration > this.verySlowRequestThreshold) {
      this.logger.error(`Very Slow API Response: ${request.method} ${request.url}`, {
        requestId,
        duration: Math.round(duration),
        status: response.status,
        size: responseSize,
        url: request.url,
        method: request.method
      }, 'PerformanceInterceptor');
    } else if (duration > this.slowRequestThreshold) {
      this.logger.warn(`Slow API Response: ${request.method} ${request.url}`, {
        requestId,
        duration: Math.round(duration),
        status: response.status,
        size: responseSize,
        url: request.url,
        method: request.method
      }, 'PerformanceInterceptor');
    } else {
      this.logger.debug(`API Response: ${request.method} ${request.url}`, {
        requestId,
        duration: Math.round(duration),
        status: response.status,
        size: responseSize
      }, 'PerformanceInterceptor');
    }

    // Log using the logger service's API method
    this.logger.logApiCall(
      request.method,
      this.sanitizeUrl(request.url),
      duration,
      response.status,
      responseSize
    );

    // Check for performance issues
    this.checkPerformanceIssues(request, duration, response.status);
  }

  private handleError(error: HttpErrorResponse, request: HttpRequest<any>, startTime: number, requestId: string): void {
    const endTime = performance.now();
    const duration = endTime - startTime;

    // Create API metric for error
    const apiMetric = {
      endpoint: this.sanitizeUrl(request.url),
      method: request.method,
      duration: Math.round(duration),
      status: error.status,
      timestamp: new Date()
    };

    // Add to state management
    this.stateService.addApiMetric(apiMetric);
    this.stateService.incrementErrorCount(`HTTP_${error.status}`);

    // Log error details
    this.logger.error(`API Error: ${request.method} ${request.url}`, {
      requestId,
      duration: Math.round(duration),
      status: error.status,
      statusText: error.statusText,
      message: error.message,
      url: request.url,
      method: request.method,
      errorDetails: this.sanitizeError(error)
    }, 'PerformanceInterceptor');

    // Log using the logger service's API method
    this.logger.logApiCall(
      request.method,
      this.sanitizeUrl(request.url),
      duration,
      error.status
    );

    // Show user-friendly error notification based on status
    this.handleUserNotification(error, request);
  }

  private checkPerformanceIssues(request: HttpRequest<any>, duration: number, status: number): void {
    // Check for consecutive slow requests
    const recentMetrics = this.stateService.getCurrentState().performance.apiMetrics
      .filter(metric => 
        metric.endpoint === this.sanitizeUrl(request.url) && 
        Date.now() - metric.timestamp.getTime() < 60000 // Last minute
      );

    if (recentMetrics.length >= 3 && recentMetrics.every(metric => metric.duration > this.slowRequestThreshold)) {
      this.logger.warn(`Consistently slow endpoint detected: ${request.url}`, {
        endpoint: this.sanitizeUrl(request.url),
        averageDuration: recentMetrics.reduce((sum, metric) => sum + metric.duration, 0) / recentMetrics.length,
        requestCount: recentMetrics.length
      }, 'PerformanceInterceptor');

      // Show warning to user for very slow responses
      if (duration > this.verySlowRequestThreshold) {
        this.stateService.showWarning(
          'Slow Connection',
          'The application is experiencing slower than normal response times. Please check your internet connection.'
        );
      }
    }

    // Check for high error rates
    const errorCount = this.stateService.getCurrentState().performance.errorCounts[`HTTP_${status}`] || 0;
    if (status >= 500 && errorCount > 3) {
      this.stateService.showError(
        'Server Issues',
        'Multiple server errors detected. Please try again later or contact support if the issue persists.'
      );
    }
  }

  private handleUserNotification(error: HttpErrorResponse, request: HttpRequest<any>): void {
    // Don't show notifications for certain endpoints or status codes
    const silentEndpoints = ['/api/logs', '/api/analytics'];
    const silentStatuses = [401, 403]; // These are handled by auth interceptor

    if (silentEndpoints.some(endpoint => request.url.includes(endpoint)) || 
        silentStatuses.includes(error.status)) {
      return;
    }

    let title = 'Request Failed';
    let message = 'An error occurred while processing your request.';

    switch (error.status) {
      case 0:
        title = 'Connection Error';
        message = 'Unable to connect to the server. Please check your internet connection.';
        break;
      case 400:
        title = 'Invalid Request';
        message = 'The request contains invalid data. Please check your input and try again.';
        break;
      case 404:
        title = 'Not Found';
        message = 'The requested resource was not found.';
        break;
      case 408:
        title = 'Request Timeout';
        message = 'The request took too long to complete. Please try again.';
        break;
      case 429:
        title = 'Too Many Requests';
        message = 'Too many requests. Please wait a moment before trying again.';
        break;
      case 500:
        title = 'Server Error';
        message = 'An internal server error occurred. Please try again later.';
        break;
      case 503:
        title = 'Service Unavailable';
        message = 'The service is temporarily unavailable. Please try again later.';
        break;
      default:
        if (error.status >= 500) {
          title = 'Server Error';
          message = 'A server error occurred. Please try again later.';
        } else if (error.status >= 400) {
          title = 'Request Error';
          message = 'There was an error with your request. Please try again.';
        }
    }

    this.stateService.showError(title, message);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove sensitive query parameters
      const sensitiveParams = ['token', 'password', 'key', 'secret'];
      sensitiveParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.pathname + (urlObj.search ? urlObj.search : '');
    } catch {
      // If URL parsing fails, just return the original URL without query params
      return url.split('?')[0];
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized: any = {};
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];
    
    if (headers && headers.keys) {
      headers.keys().forEach((key: string) => {
        const lowerKey = key.toLowerCase();
        if (!sensitiveHeaders.includes(lowerKey)) {
          sanitized[key] = headers.get(key);
        } else {
          sanitized[key] = '[REDACTED]';
        }
      });
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return '[Non-JSON Body]';
      }
    }

    if (typeof body === 'object') {
      const sanitized = { ...body };
      const sensitiveFields = ['password', 'token', 'secret', 'key', 'credit_card', 'ssn'];
      
      sensitiveFields.forEach(field => {
        if (field in sanitized) {
          sanitized[field] = '[REDACTED]';
        }
      });
      
      return sanitized;
    }

    return body;
  }

  private sanitizeError(error: HttpErrorResponse): any {
    return {
      status: error.status,
      statusText: error.statusText,
      url: this.sanitizeUrl(error.url || ''),
      message: error.message,
      name: error.name,
      ok: error.ok
    };
  }

  private estimateResponseSize(response: HttpResponse<any>): number {
    try {
      if (response.body) {
        return JSON.stringify(response.body).length;
      }
    } catch {
      // Fallback estimation
      return 0;
    }
    return 0;
  }
}