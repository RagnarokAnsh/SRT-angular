import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';

import type { Level } from '@core/models/level';

/** A readiness level as a coloured label (dark text on the level colour). */
@Component({
  selector: 'app-level-badge',
  imports: [TranslocoPipe],
  template: `
    @if (level(); as level) {
      <span class="badge" [style.--badge-color]="'var(--level-' + level + '-soft)'">
        {{ 'levels.' + level + '.label' | transloco }}
      </span>
    } @else {
      <span class="badge badge--unknown">{{ fallback() || '—' }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px var(--space-2);
      border-radius: var(--radius-pill);
      background: var(--badge-color);
      color: var(--level-text);
      font-size: var(--text-xs);
      font-weight: 700;
      line-height: 1.3;
      white-space: nowrap;
    }
    .badge--unknown {
      background: var(--color-surface-sunken);
      color: var(--color-text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelBadge {
  readonly level = input<Level | null>(null);
  /** Shown when the level isn't recognised (e.g. an unusual value stored by the API). */
  readonly fallback = input('');
}
