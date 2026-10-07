import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '../i18n/language';
import type { TranslationParams } from '../i18n/params';
import { translatePlural } from '../i18n/plural';
import { type AppError, toAppError } from '../network/app-error';

type Kind = 'success' | 'info' | 'error';

/** Short translated messages (Material snack bar, announced to screen readers). */
@Injectable({ providedIn: 'root' })
export class NotifyService {
  private readonly snackBar = inject(MatSnackBar);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  success(key: string, params?: TranslationParams): void {
    this.open(this.transloco.translate(key, params), 'success');
  }

  /** `success` for a plural key (`key.one` / `key.other`, with `{{count}}`). */
  successCount(key: string, count: number, params?: TranslationParams): void {
    this.open(
      translatePlural(this.transloco, this.language.locale(), key, count, params),
      'success',
    );
  }

  info(key: string, params?: TranslationParams): void {
    this.open(this.transloco.translate(key, params), 'info');
  }

  /** Shows the friendly message for a failed request (plus the server's own text for 4xx). */
  error(error: AppError | unknown): void {
    this.open(this.describe(toAppError(error)), 'error');
  }

  /** An error message; `action` replaces the Dismiss button (e.g. "Reload"). */
  errorKey(
    key: string,
    params?: TranslationParams,
    action?: { labelKey: string; run: () => void },
  ): void {
    this.open(this.transloco.translate(key, params), 'error', action);
  }

  describe(error: AppError): string {
    const message = this.transloco.translate(error.messageKey);
    return error.serverMessage ? `${message} (${error.serverMessage})` : message;
  }

  private open(message: string, kind: Kind, action?: { labelKey: string; run: () => void }): void {
    const ref = this.snackBar.open(
      message,
      this.transloco.translate(action?.labelKey ?? 'common.dismiss'),
      {
        duration: kind === 'error' ? 8000 : 4000,
        panelClass: ['app-snack', `app-snack--${kind}`],
        politeness: kind === 'error' ? 'assertive' : 'polite',
      },
    );
    if (action) ref.onAction().subscribe(() => action.run());
  }
}
