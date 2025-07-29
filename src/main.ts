import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Only disable console in production, but this needs to be done at build time
if (environment.production) {
  // Override console methods in production
  const noop = () => {};
  if (!environment.enableConsoleLogging) {
    window.console.log = noop;
    window.console.warn = noop;
    window.console.info = noop;
    window.console.debug = noop;
    // Keep console.error for critical production errors
    const originalError = window.console.error;
    window.console.error = (...args: any[]) => {
      if (environment.enableErrorLogging) {
        originalError.apply(console, args);
      }
    };
  }
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    console.error('Application failed to start:', err);
  });