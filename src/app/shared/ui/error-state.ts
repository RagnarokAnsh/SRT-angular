import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { type AppError, isRetryable } from '@core/network/app-error';

import { StateMessage } from './state-message';

const ICONS: Partial<Record<AppError['kind'], string>> = {
  offline: 'offline',
  network: 'offline',
  timeout: 'pending',
  server: 'server-off',
  forbidden: 'lock',
  notFound: 'not-found',
};

/** Friendly failure message with a retry button (for anything that can be retried). */
@Component({
  selector: 'app-error-state',
  imports: [StateMessage, MatButtonModule, MatIconModule, TranslocoPipe],
  template: `
    <app-state-message
      tone="error"
      [icon]="icon()"
      [title]="(title() || 'errors.loadFailedTitle') | transloco"
      [message]="(error().messageKey | transloco) + (error().serverMessage ? ' (' + error().serverMessage + ')' : '')"
    >
      @if (canRetry()) {
        <button mat-flat-button type="button" (click)="retry.emit()">
          <mat-icon svgIcon="refresh" aria-hidden="true" />
          {{ 'common.retry' | transloco }}
        </button>
      }
      <ng-content />
    </app-state-message>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly error = input.required<AppError>();
  /** Translation key; defaults to a generic "couldn't load" title. */
  readonly title = input('');
  readonly retry = output<void>();

  protected readonly icon = computed(() => ICONS[this.error().kind] ?? 'error');
  protected readonly canRetry = computed(() => isRetryable(this.error()));
}
