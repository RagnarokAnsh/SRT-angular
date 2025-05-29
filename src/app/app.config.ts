import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { NGX_ECHARTS_CONFIG } from 'ngx-echarts';
import { HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Lara from '@primeng/themes/lara';

import { routes } from './app.routes';

// Functional interceptor for Angular 19
export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const token = localStorage.getItem('token');
  
  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }
  
  return next(req);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(), // Added for PrimeNG animations
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          prefix: 'p',
          cssLayer: {
            name: 'primeng',
            order: 'primeui'
          }
        }
      }
    }),
    MessageService,
    {
      provide: NGX_ECHARTS_CONFIG,
      useValue: {
        echarts: () => import('echarts')
      }
    }
  ]
};