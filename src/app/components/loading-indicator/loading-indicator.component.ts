import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../core/services/loading.service';

@Component({
  selector: 'app-loading-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading$ | async) {
      <div class="loading-overlay" 
           role="alert" 
           aria-live="polite" 
           aria-label="Content is loading">
        <div class="loading-spinner">
          <div class="spinner-container">
            <div class="spinner-ring"></div>
            <div class="spinner-logo">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="currentColor" opacity="0.8"/>
                <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/>
              </svg>
            </div>
          </div>
          <p class="loading-text">Loading...</p>
        </div>
      </div>
    }
  `,
  styles: [`
    .loading-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(248, 244, 243, 0.95);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .loading-spinner {
      text-align: center;
    }

    .spinner-container {
      position: relative;
      width: 80px;
      height: 80px;
      margin: 0 auto 1rem;
    }

    .spinner-ring {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border: 4px solid #f8f4f3;
      border-top-color: #f84525;
      border-radius: 50%;
      animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .spinner-logo {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #f84525;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.95); }
    }

    .loading-text {
      font-family: 'Figtree', sans-serif;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
      margin: 0;
      letter-spacing: 0.05em;
      animation: textPulse 1.5s ease-in-out infinite;
    }

    @keyframes textPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Mobile optimization */
    @media (max-width: 768px) {
      .spinner-container {
        width: 60px;
        height: 60px;
      }

      .spinner-logo svg {
        width: 36px;
        height: 36px;
      }

      .loading-text {
        font-size: 0.875rem;
      }
    }
  `]
})
export class LoadingIndicatorComponent {
  private loadingService = inject(LoadingService);
  loading$ = this.loadingService.loading$;
}
