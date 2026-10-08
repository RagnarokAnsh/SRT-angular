import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import type { ChangeCounts } from '../dashboard-model';

/**
 * "Since the session before: ↑ 3 better · → 2 same · ↓ 1 lower", each student's latest result
 * against their one before (arrows and words, not colour alone).
 */
@Component({
  selector: 'app-change-summary',
  imports: [MatIconModule, TranslocoPipe],
  template: `
    <p class="change">
      <span class="change__title">
        {{ 'dashboard.change.title' | transloco }}
      </span>
      @if (change().up + change().same + change().down === 0) {
        <span class="change__empty">{{ 'dashboard.change.none' | transloco }}</span>
      } @else {
        <span class="change__item change__item--up">
          <mat-icon svgIcon="arrow-up" aria-hidden="true" />
          {{ 'dashboard.change.up' | transloco: { count: change().up } }}
        </span>
        <span class="change__item">
          <mat-icon svgIcon="arrow-right" aria-hidden="true" />
          {{ 'dashboard.change.same' | transloco: { count: change().same } }}
        </span>
        <span class="change__item change__item--down">
          <mat-icon svgIcon="arrow-down" aria-hidden="true" />
          {{ 'dashboard.change.down' | transloco: { count: change().down } }}
        </span>
      }
    </p>
  `,
  styles: `
    :host {
      display: block;
    }
    .change {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      margin: 0;
      color: var(--color-text);
      font-size: var(--text-sm);
    }
    .change__title {
      color: var(--color-text-muted);
      font-weight: 600;
    }
    .change__empty {
      color: var(--color-text-muted);
    }
    .change__item {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      white-space: nowrap;

      mat-icon {
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
      }
    }
    .change__item--up mat-icon {
      color: var(--color-success);
    }
    .change__item--down mat-icon {
      color: var(--color-danger);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangeSummary {
  readonly change = input.required<ChangeCounts>();
}
