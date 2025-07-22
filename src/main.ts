import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { LoggerService } from './app/core/logger.service';
import { inject } from '@angular/core';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    const logger = inject(LoggerService);
    logger.error(err);
  });
//hello world