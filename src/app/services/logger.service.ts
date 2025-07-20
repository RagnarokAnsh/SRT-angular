import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
  source?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
}

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly maxLogEntries = 1000;
  private readonly logBuffer: LogEntry[] = [];
  private readonly performanceMetrics: Map<string, PerformanceMetric> = new Map();
  private sessionId: string;
  private userId?: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandler();
    this.setupPerformanceObserver();
  }

  /**
   * Set the current user ID for logging context
   */
  setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * Log error messages
   */
  error(message: string, data?: any, source?: string): void {
    this.log(LogLevel.ERROR, message, data, source);
  }

  /**
   * Log warning messages
   */
  warn(message: string, data?: any, source?: string): void {
    this.log(LogLevel.WARN, message, data, source);
  }

  /**
   * Log info messages
   */
  info(message: string, data?: any, source?: string): void {
    this.log(LogLevel.INFO, message, data, source);
  }

  /**
   * Log debug messages (only in development)
   */
  debug(message: string, data?: any, source?: string): void {
    this.log(LogLevel.DEBUG, message, data, source);
  }

  /**
   * Log trace messages (only in development)
   */
  trace(message: string, data?: any, source?: string): void {
    this.log(LogLevel.TRACE, message, data, source);
  }

  /**
   * Start performance tracking
   */
  startPerformance(name: string, metadata?: any): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    this.performanceMetrics.set(name, metric);
    this.debug(`Performance tracking started: ${name}`, metadata, 'PerformanceTracker');
  }

  /**
   * End performance tracking
   */
  endPerformance(name: string): number | null {
    const metric = this.performanceMetrics.get(name);
    if (!metric) {
      this.warn(`Performance metric not found: ${name}`, null, 'PerformanceTracker');
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;
    
    this.info(`Performance: ${name} completed in ${metric.duration.toFixed(2)}ms`, {
      name: metric.name,
      duration: metric.duration,
      metadata: metric.metadata
    }, 'PerformanceTracker');

    // Send performance data to analytics in production
    if (environment.production && metric.duration > 1000) {
      this.sendPerformanceData(metric);
    }

    this.performanceMetrics.delete(name);
    return metric.duration;
  }

  /**
   * Log API call performance
   */
  logApiCall(method: string, url: string, duration: number, status: number, size?: number): void {
    const logData = {
      method,
      url,
      duration: Math.round(duration),
      status,
      size: size || 0,
      timestamp: new Date().toISOString()
    };

    if (status >= 400) {
      this.error(`API Error: ${method} ${url}`, logData, 'ApiTracker');
    } else if (duration > 2000) {
      this.warn(`Slow API: ${method} ${url}`, logData, 'ApiTracker');
    } else {
      this.debug(`API Call: ${method} ${url}`, logData, 'ApiTracker');
    }

    // Send to analytics in production
    if (environment.production) {
      this.sendApiMetrics(logData);
    }
  }

  /**
   * Log user interactions
   */
  logUserAction(action: string, component: string, data?: any): void {
    const logData = {
      action,
      component,
      data,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.info(`User Action: ${action} in ${component}`, logData, 'UserTracker');

    // Send to analytics in production
    if (environment.production) {
      this.sendUserActionData(logData);
    }
  }

  /**
   * Log component lifecycle events
   */
  logComponentLifecycle(component: string, lifecycle: string, data?: any): void {
    this.debug(`Component ${component}: ${lifecycle}`, data, 'ComponentTracker');
  }

  /**
   * Get log entries for debugging
   */
  getLogEntries(level?: LogLevel): LogEntry[] {
    if (level !== undefined) {
      return this.logBuffer.filter(entry => entry.level <= level);
    }
    return [...this.logBuffer];
  }

  /**
   * Clear log buffer
   */
  clearLogs(): void {
    this.logBuffer.length = 0;
    this.info('Log buffer cleared', null, 'LoggerService');
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      userId: this.userId,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      logs: this.logBuffer
    }, null, 2);
  }

  /**
   * Main logging method
   */
  private log(level: LogLevel, message: string, data?: any, source?: string): void {
    // Check if we should log based on environment and level
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
      source,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Add stack trace for errors
    if (level === LogLevel.ERROR) {
      logEntry.stackTrace = new Error().stack;
    }

    // Add to buffer
    this.addToBuffer(logEntry);

    // Console output
    this.outputToConsole(logEntry);

    // Send to external service in production
    if (environment.production && level <= LogLevel.WARN) {
      this.sendToExternalService(logEntry);
    }
  }

  /**
   * Check if we should log based on level and environment
   */
  private shouldLog(level: LogLevel): boolean {
    const currentLogLevel = environment.production ? LogLevel.WARN : LogLevel.TRACE;
    return level <= currentLogLevel;
  }

  /**
   * Add entry to log buffer
   */
  private addToBuffer(logEntry: LogEntry): void {
    this.logBuffer.push(logEntry);
    
    // Maintain buffer size
    if (this.logBuffer.length > this.maxLogEntries) {
      this.logBuffer.shift();
    }
  }

  /**
   * Output to browser console
   */
  private outputToConsole(logEntry: LogEntry): void {
    const message = `[${logEntry.timestamp.toISOString()}] [${LogLevel[logEntry.level]}] ${logEntry.source ? `[${logEntry.source}] ` : ''}${logEntry.message}`;
    
    switch (logEntry.level) {
      case LogLevel.ERROR:
        console.error(message, logEntry.data || '', logEntry.stackTrace || '');
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, logEntry.data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(message, logEntry.data || '');
        break;
      case LogLevel.TRACE:
        console.trace(message, logEntry.data || '');
        break;
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.toString()
      }, 'GlobalErrorHandler');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason?.toString(),
        promise: event.promise
      }, 'GlobalErrorHandler');
    });
  }

  /**
   * Setup performance observer
   */
  private setupPerformanceObserver(): void {
    if ('PerformanceObserver' in window) {
      try {
        // Observe navigation performance
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.info('Navigation Performance', {
                domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
                loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
                dnsLookup: navEntry.domainLookupEnd - navEntry.domainLookupStart,
                totalTime: navEntry.loadEventEnd - navEntry.navigationStart
              }, 'PerformanceObserver');
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // Observe resource performance
        const resourceObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 1000) { // Log slow resources
              this.warn('Slow Resource Load', {
                name: entry.name,
                duration: entry.duration,
                size: (entry as any).transferSize || 0,
                type: (entry as any).initiatorType
              }, 'PerformanceObserver');
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });

      } catch (error) {
        this.warn('Could not setup PerformanceObserver', error, 'LoggerService');
      }
    }
  }

  /**
   * Send logs to external logging service (implement based on your needs)
   */
  private sendToExternalService(logEntry: LogEntry): void {
    // Example implementation - replace with your logging service
    if (environment.production) {
      try {
        // You can implement this to send to services like:
        // - Sentry
        // - LogRocket
        // - DataDog
        // - Custom logging endpoint
        
        // Example fetch to custom endpoint:
        /*
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry)
        }).catch(() => {}); // Silent fail
        */
      } catch (error) {
        // Silent fail to prevent logging loops
      }
    }
  }

  /**
   * Send performance data to analytics
   */
  private sendPerformanceData(metric: PerformanceMetric): void {
    if (environment.production) {
      try {
        // Send to analytics service
        /*
        fetch('/api/analytics/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            userId: this.userId,
            metric
          })
        }).catch(() => {});
        */
      } catch (error) {
        // Silent fail
      }
    }
  }

  /**
   * Send API metrics to analytics
   */
  private sendApiMetrics(data: any): void {
    if (environment.production) {
      try {
        // Send to analytics service
        /*
        fetch('/api/analytics/api-metrics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: this.sessionId,
            userId: this.userId,
            ...data
          })
        }).catch(() => {});
        */
      } catch (error) {
        // Silent fail
      }
    }
  }

  /**
   * Send user action data to analytics
   */
  private sendUserActionData(data: any): void {
    if (environment.production) {
      try {
        // Send to analytics service
        /*
        fetch('/api/analytics/user-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        }).catch(() => {});
        */
      } catch (error) {
        // Silent fail
      }
    }
  }
}