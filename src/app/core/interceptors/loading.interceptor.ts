import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
    const loadingService = inject(LoadingService);

    // Show loading for API calls only
    if (req.url.includes('/api/')) {
        loadingService.show();
    }

    return next(req).pipe(
        finalize(() => {
            if (req.url.includes('/api/')) {
                // Small delay to prevent flashing for quick requests
                setTimeout(() => loadingService.hide(), 300);
            }
        })
    );
};
