import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AppStateService } from '../state/app.state';
import { catchError } from 'rxjs/operators';

export interface ErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  severity: 'error' | 'warn' | 'info';
  retryable: boolean;
  timestamp: Date;
  context?: any;
}

export interface ErrorConfig {
  enableLogging: boolean;
  enableUserNotifications: boolean;
  enableErrorRecovery: boolean;
  maxRetries: number;
  retryDelay: number;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlerService {
  private readonly config: ErrorConfig = {
    enableLogging: true,
    enableUserNotifications: true,
    enableErrorRecovery: true,
    maxRetries: 3,
    retryDelay: 1000
  };
  
  private errorHistory: ErrorInfo[] = [];
  private retryCount = 0;
  
  constructor(
    private messageService: MessageService,
    private appState: AppStateService
  ) {}
  
  // Main error handling method
  handleError(error: any, context?: string): Observable<never> {
    const errorInfo = this.createErrorInfo(error, context);
    
    // Log error
    if (this.config.enableLogging) {
      this.logError(errorInfo);
    }
    
    // Store in state
    this.appState.setError(errorInfo.userMessage, context || 'general');
    
    // Show user notification
    if (this.config.enableUserNotifications) {
      this.showUserNotification(errorInfo);
    }
    
    // Handle specific error types
    this.handleSpecificError(errorInfo);
    
    return throwError(() => error);
  }
  
  // HTTP Error Handling
  handleHttpError(error: HttpErrorResponse, context?: string): Observable<never> {
    let errorInfo: ErrorInfo;
    
    switch (error.status) {
      case 0:
        errorInfo = {
          code: 'NETWORK_ERROR',
          message: 'Network connection failed',
          userMessage: 'Unable to connect to server. Please check your internet connection.',
          severity: 'error',
          retryable: true,
          timestamp: new Date(),
          context
        };
        break;
        
      case 400:
        errorInfo = {
          code: 'BAD_REQUEST',
          message: 'Invalid request data',
          userMessage: 'The request contains invalid data. Please check your input and try again.',
          severity: 'warn',
          retryable: false,
          timestamp: new Date(),
          context
        };
        break;
        
      case 401:
        errorInfo = {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          userMessage: 'Your session has expired. Please log in again.',
          severity: 'error',
          retryable: false,
          timestamp: new Date(),
          context
        };
        this.handleAuthenticationError();
        break;
        
      case 403:
        errorInfo = {
          code: 'FORBIDDEN',
          message: 'Access denied',
          userMessage: 'You do not have permission to perform this action.',
          severity: 'error',
          retryable: false,
          timestamp: new Date(),
          context
        };
        break;
        
      case 404:
        errorInfo = {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          userMessage: 'The requested resource was not found.',
          severity: 'warn',
          retryable: false,
          timestamp: new Date(),
          context
        };
        break;
        
      case 422:
        errorInfo = {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          userMessage: this.extractValidationErrors(error),
          severity: 'warn',
          retryable: false,
          timestamp: new Date(),
          context
        };
        break;
        
      case 429:
        errorInfo = {
          code: 'RATE_LIMITED',
          message: 'Too many requests',
          userMessage: 'Too many requests. Please wait a moment and try again.',
          severity: 'warn',
          retryable: true,
          timestamp: new Date(),
          context
        };
        break;
        
      case 500:
        errorInfo = {
          code: 'SERVER_ERROR',
          message: 'Internal server error',
          userMessage: 'A server error occurred. Please try again later.',
          severity: 'error',
          retryable: true,
          timestamp: new Date(),
          context
        };
        break;
        
      case 502:
      case 503:
      case 504:
        errorInfo = {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
          userMessage: 'The service is temporarily unavailable. Please try again later.',
          severity: 'error',
          retryable: true,
          timestamp: new Date(),
          context
        };
        break;
        
      default:
        errorInfo = {
          code: 'UNKNOWN_ERROR',
          message: `HTTP ${error.status}: ${error.statusText}`,
          userMessage: 'An unexpected error occurred. Please try again.',
          severity: 'error',
          retryable: true,
          timestamp: new Date(),
          context
        };
    }
    
    return this.handleError(error, context);
  }
  
  // Validation Error Extraction
  private extractValidationErrors(error: HttpErrorResponse): string {
    if (error.error && error.error.errors) {
      const errors = error.error.errors;
      const errorMessages = Object.keys(errors).map(key => 
        `${key}: ${errors[key].join(', ')}`
      );
      return errorMessages.join('; ');
    }
    
    if (error.error && error.error.message) {
      return error.error.message;
    }
    
    return 'Please check your input and try again.';
  }
  
  // Authentication Error Handling
  private handleAuthenticationError(): void {
    // Clear authentication state
    this.appState.clearAuthentication();
    
    // Redirect to login after a short delay
    setTimeout(() => {
      window.location.href = '/login?expired=true';
    }, 2000);
  }
  
  // Specific Error Handling
  private handleSpecificError(errorInfo: ErrorInfo): void {
    switch (errorInfo.code) {
      case 'NETWORK_ERROR':
        this.handleNetworkError();
        break;
        
      case 'RATE_LIMITED':
        this.handleRateLimitError();
        break;
        
      case 'VALIDATION_ERROR':
        this.handleValidationError(errorInfo);
        break;
        
      default:
        // Default handling
        break;
    }
  }
  
  // Network Error Handling
  private handleNetworkError(): void {
    // Implement offline mode or retry logic
    console.warn('Network error detected - implementing offline mode');
  }
  
  // Rate Limit Error Handling
  private handleRateLimitError(): void {
    // Implement exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    setTimeout(() => {
      this.retryCount = 0;
    }, delay);
  }
  
  // Validation Error Handling
  private handleValidationError(errorInfo: ErrorInfo): void {
    // Clear form errors and show specific validation messages
    this.appState.clearError('form');
  }
  
  // Error Recovery
  handleErrorWithRetry<T>(
    operation: () => Observable<T>,
    context?: string,
    maxRetries: number = this.config.maxRetries
  ): Observable<T> {
    return operation().pipe(
      catchError(error => {
        if (this.retryCount < maxRetries) {
          this.retryCount++;
          console.log(`Retrying operation (${this.retryCount}/${maxRetries})`);
          
                     return new Observable<T>(observer => {
             setTimeout(() => {
               this.handleErrorWithRetry(operation, context, maxRetries).subscribe(observer);
             }, this.config.retryDelay * this.retryCount);
           });
        } else {
          this.retryCount = 0;
          return this.handleError(error, context);
        }
      })
    );
  }
  
  // Error Info Creation
  private createErrorInfo(error: any, context?: string): ErrorInfo {
    let code = 'UNKNOWN_ERROR';
    let message = 'An unknown error occurred';
    let userMessage = 'Something went wrong. Please try again.';
    let severity: 'error' | 'warn' | 'info' = 'error';
    let retryable = false;
    
    if (error instanceof HttpErrorResponse) {
      return this.createHttpErrorInfo(error, context);
    }
    
    if (error instanceof Error) {
      message = error.message;
      code = error.name || 'ERROR';
      
      // Handle specific error types
      if (error.name === 'TypeError') {
        userMessage = 'There was a problem with the data format.';
        retryable = true;
      } else if (error.name === 'ReferenceError') {
        userMessage = 'A system error occurred. Please refresh the page.';
        retryable = true;
      }
    }
    
    if (typeof error === 'string') {
      message = error;
      userMessage = error;
    }
    
    return {
      code,
      message,
      userMessage,
      severity,
      retryable,
      timestamp: new Date(),
      context
    };
  }
  
  private createHttpErrorInfo(error: HttpErrorResponse, context?: string): ErrorInfo {
    // This is handled in handleHttpError method
    return {
      code: 'HTTP_ERROR',
      message: `${error.status}: ${error.statusText}`,
      userMessage: 'A network error occurred.',
      severity: 'error',
      retryable: true,
      timestamp: new Date(),
      context
    };
  }
  
  // User Notification
  private showUserNotification(errorInfo: ErrorInfo): void {
    this.messageService.add({
      severity: errorInfo.severity,
      summary: this.getErrorSummary(errorInfo.code),
      detail: errorInfo.userMessage,
      life: this.getErrorLife(errorInfo.severity)
    });
  }
  
  private getErrorSummary(code: string): string {
    const summaries: { [key: string]: string } = {
      'NETWORK_ERROR': 'Connection Error',
      'UNAUTHORIZED': 'Authentication Error',
      'FORBIDDEN': 'Access Denied',
      'VALIDATION_ERROR': 'Validation Error',
      'SERVER_ERROR': 'Server Error',
      'RATE_LIMITED': 'Rate Limited',
      'NOT_FOUND': 'Not Found',
      'BAD_REQUEST': 'Invalid Request'
    };
    
    return summaries[code] || 'Error';
  }
  
  private getErrorLife(severity: string): number {
    switch (severity) {
      case 'error': return 8000;
      case 'warn': return 5000;
      case 'info': return 3000;
      default: return 5000;
    }
  }
  
  // Error Logging
  private logError(errorInfo: ErrorInfo): void {
    const logEntry = {
      timestamp: errorInfo.timestamp.toISOString(),
      code: errorInfo.code,
      message: errorInfo.message,
      userMessage: errorInfo.userMessage,
      severity: errorInfo.severity,
      retryable: errorInfo.retryable,
      context: errorInfo.context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: errorInfo.context?.stack
    };
    
    console.error('Error Log:', logEntry);
    
    // Store in error history
    this.errorHistory.push(errorInfo);
    
    // Keep only last 100 errors
    if (this.errorHistory.length > 100) {
      this.errorHistory = this.errorHistory.slice(-100);
    }
    
    // In production, send to error tracking service
    // this.sendToErrorTracking(logEntry);
  }
  
  // Error Tracking (for production)
  private sendToErrorTracking(logEntry: any): void {
    // Implementation for production error tracking
    // Example: Sentry, LogRocket, etc.
    console.log('Sending error to tracking service:', logEntry);
  }
  
  // Error History
  getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }
  
  // Clear Error History
  clearErrorHistory(): void {
    this.errorHistory = [];
  }
  
  // Get Error Statistics
  getErrorStatistics(): { total: number; bySeverity: { [key: string]: number }; byCode: { [key: string]: number } } {
    const bySeverity: { [key: string]: number } = {};
    const byCode: { [key: string]: number } = {};
    
    this.errorHistory.forEach(error => {
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
      byCode[error.code] = (byCode[error.code] || 0) + 1;
    });
    
    return {
      total: this.errorHistory.length,
      bySeverity,
      byCode
    };
  }
  
  // Reset retry count
  resetRetryCount(): void {
    this.retryCount = 0;
  }
  
  // Get current retry count
  getRetryCount(): number {
    return this.retryCount;
  }
} 