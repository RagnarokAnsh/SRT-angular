import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors, HTTP_INTERCEPTORS } from '@angular/common/http';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Lara from '@primeng/themes/lara';
import { inject } from '@angular/core';

import { routes } from './app.routes';
import { AuthInterceptor, createAuthInterceptor } from './auth/auth.interceptor';
import { PerformanceInterceptor } from './interceptors/performance.interceptor';
import { UserService } from './services/user.service';
import { LoggerService } from './services/logger.service';
import { StateManagementService } from './services/state-management.service';
import { Router } from '@angular/router';

// Enhanced functional interceptor for Angular 19
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const userService = inject(UserService);
  const router = inject(Router);
  
  return createAuthInterceptor(userService, router)(req, next);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    // HTTP Interceptors for production monitoring
    { provide: HTTP_INTERCEPTORS, useClass: PerformanceInterceptor, multi: true },
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          prefix: 'p',
          cssLayer: {
            name: 'primeng',
            order: 'primeui'
          },
          colorScheme: 'light',
          variables: {
            primaryColor: '#f84525',
            primaryColorText: '#ffffff',
            surfaceSection: '#ffffff',
            borderRadius: '0.5rem'
          }
        }
      }
    }),
    MessageService,
    UserService,
    LoggerService,
    StateManagementService,
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: {
        echarts: () => import('echarts')
      }
    }
  ]
};