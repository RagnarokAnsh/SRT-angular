import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Centered icon + title + message, used for empty and error states. */
@Component({
  selector: 'app-state-message',
  imports: [MatIconModule],
  template: `
    <div class="icon" [class.icon--error]="tone() === 'error'">
      <mat-icon [svgIcon]="icon()" aria-hidden="true" />
    </div>
    <h2 class="title">{{ title() }}</h2>
    @if (message()) {
      <p class="message">{{ message() }}</p>
    }
    <div class="actions"><ng-content /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-10) var(--space-4);
      text-align: center;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      margin-bottom: var(--space-2);
      border-radius: 50%;
      background: var(--color-secondary-soft);
      color: var(--color-secondary-strong);
    }
    .icon--error {
      background: var(--color-danger-soft);
      color: var(--color-danger);
    }
    .icon mat-icon {
      width: 32px;
      height: 32px;
    }
    .title {
      margin: 0;
      font-size: var(--text-xl);
    }
    .message {
      max-width: 46ch;
      margin: 0;
      color: var(--color-text-muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-2);
      margin-top: var(--space-3);
    }
    .actions:empty {
      display: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateMessage {
  readonly icon = input('info');
  readonly title = input.required<string>();
  readonly message = input<string>('');
  readonly tone = input<'neutral' | 'error'>('neutral');
}
