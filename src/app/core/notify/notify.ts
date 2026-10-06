import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';

import type { TranslationParams } from '../i18n/params';
import { type AppError, toAppError } from '../network/app-error';

type Kind = 'success' | 'info' | 'error';

/** Short translated messages (Material snack bar, announced to screen readers). */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);

  success(key: string, params?: TranslationParams): void {
    this.open(this.transloco.translate(key, params), 'success');
  }

  info(key: string, params?: TranslationParams): void {
    this.open(this.transloco.translate(key, params), 'info');
  }

  /** Shows the friendly message for a failed request (plus the server's own text for 4xx). */
  error(error: AppError | unknown): void {
    this.open(this.describe(toAppError(error)), 'error');
  }

  errorKey(key: string, params?: TranslationParams): void {
    this.open(this.transloco.translate(key, params), 'error');
  }

  describe(error: AppError): string {
    const message = this.transloco.translate(error.messageKey);
    return error.serverMessage ? `${message} (${error.serverMessage})` : message;
  }

  private open(message: string, kind: Kind): void {
    this.snackBar.open(message, this.transloco.translate('common.dismiss'), {
      duration: kind === 'error' ? 8000 : 4000,
      panelClass: ['app-snack', `app-snack--${kind}`],
      politeness: kind === 'error' ? 'assertive' : 'polite',
    });
  }
}
