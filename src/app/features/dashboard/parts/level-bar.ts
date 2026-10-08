import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';

import { STANDINGS, type Standing, percent } from '../dashboard-model';
import { STANDING_COLOR, STANDING_INK, standingLabelKey } from './standings';

/** Below this share of the bar a segment is too narrow for its number (legend + tooltip). */
const MIN_LABEL_SHARE = 0.1;

/**
 * One horizontal stacked bar: how many are at each level, in level order, with "other" and
 * "not assessed" last. Numbers sit inside the segments wide enough for them; every value is
 * also in the tooltip, the spoken label and the table view.
 */
@Component({
  selector: 'app-level-bar',
  imports: [MatTooltipModule],
  template: `
    <div class="row">
      @if (label(); as text) {
        <span class="label" aria-hidden="true">{{ text }}</span>
      }
      <div class="bar" role="img" [attr.aria-label]="spoken()">
        @for (segment of segments(); track segment.standing) {
          <span
            class="segment"
            [style.flex-grow]="segment.count"
            [style.background]="segment.color"
            [style.color]="segment.ink"
            [matTooltip]="segment.tooltip"
            matTooltipPosition="above"
          >
            @if (segment.showNumber) {
              <span class="value">{{ segment.count }}</span>
            }
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .row {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
    .label {
      flex: none;
      min-width: 2.25rem;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    // Segments are separated by a 2px surface gap, not by borders; the bar is 22px thick with
    // a rounded data end.
    .bar {
      display: flex;
      flex: 1 1 auto;
      gap: 2px;
      min-width: 0;
      height: 22px;
      overflow: hidden;
      border-radius: 0 4px 4px 0;
    }
    .segment {
      display: grid;
      place-items: center;
      min-width: 3px;
    }
    .value {
      padding-inline: 4px;
      font-size: 0.75rem;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      line-height: 1;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LevelBar {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  readonly counts = input.required<Record<Standing, number>>();
  readonly total = input.required<number>();
  /** Shown before the bar, e.g. "S1". */
  readonly label = input<string | null>(null);
  /** Read before the values, e.g. "Seriation, session 1". */
  readonly caption = input('');

  protected readonly segments = computed(() => {
    this.language.current();
    const counts = this.counts();
    const total = this.total();
    return STANDINGS.filter((standing) => counts[standing] > 0).map((standing) => {
      const count = counts[standing];
      const name = this.transloco.translate(standingLabelKey(standing));
      return {
        standing,
        count,
        color: STANDING_COLOR[standing],
        ink: STANDING_INK[standing],
        showNumber: total > 0 && count / total >= MIN_LABEL_SHARE,
        tooltip: this.transloco.translate('dashboard.segmentTooltip', {
          count,
          percent: percent(count, total),
          level: name,
        }),
        name,
      };
    });
  });

  protected readonly spoken = computed(() => {
    const parts = this.segments().map((s) => `${s.name}: ${s.count}`);
    const caption = this.caption();
    return caption ? `${caption}. ${parts.join(', ')}` : parts.join(', ');
  });
}
