import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  private readonly currentLogLevel: LogLevel;

  constructor() {
    this.currentLogLevel = this.getLogLevel();
  }

  private getLogLevel(): LogLevel {
    if (environment.production) {
      switch (environment.logLevel) {
        case 'debug': return LogLevel.DEBUG;
        case 'info': return LogLevel.INFO;
        case 'warn': return LogLevel.WARN;
        case 'error': return LogLevel.ERROR;
        default: return LogLevel.ERROR;
      }
    }
    return LogLevel.DEBUG;
  }

  debug(...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug('[DEBUG]', ...args);
    }
  }

  log(...args: any[]): void {
    this.info(...args);
  }

  info(...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info('[INFO]', ...args);
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn('[WARN]', ...args);
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error('[ERROR]', ...args);
      
      // In production, you might want to send errors to a remote logging service
      if (environment.production && environment.enableRemoteLogging) {
        this.sendToRemoteLogger('error', args);
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.currentLogLevel;
  }

  private sendToRemoteLogger(level: string, args: any[]): void {
    // Implement remote logging service integration here
    // Example: send to your analytics/monitoring service
    try {
      // This is where you'd integrate with services like Sentry, LogRocket, etc.
      if (environment.enableErrorTracking) {
        // Implementation depends on your monitoring service
      }
    } catch (err) {
      // Silently fail remote logging to avoid recursive errors
    }
  }
} 