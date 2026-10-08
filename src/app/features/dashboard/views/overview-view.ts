import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe } from '@jsverse/transloco';

import { domainColors } from '@core/catalog/framework';
import { DomainNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';

import type { CombinedSummary, DomainSummary } from '../dashboard-model';
import { ChangeSummary } from '../parts/change-summary';
import { LevelBar } from '../parts/level-bar';

/** Every domain at a glance: a bar per chosen session, and how many got better or worse. */
@Component({
  selector: 'app-dashboard-overview',
  imports: [MatIconModule, TranslocoPipe, DomainNamePipe, PluralPipe, ChangeSummary, LevelBar],
  template: `
    <p class="intro">{{ 'dashboard.overview.subtitle' | transloco }}</p>

    @if (total(); as all) {
      <section class="card card--total" aria-labelledby="overview-all">
        <h3 class="card__title" id="overview-all">
          {{ 'dashboard.overview.allTogether' | transloco }}
        </h3>
        <p class="card__meta">{{ 'competencies.count' | plural: all.competencies }}</p>
        <div class="bars">
          @for (bar of all.bars; track bar.session) {
            <app-level-bar
              [counts]="bar.counts"
              [total]="bar.total"
              [label]="'dashboard.sessionShort' | transloco: { n: bar.session }"
              [caption]="
                'dashboard.sessionCaption'
                  | transloco
                    : { name: ('dashboard.overview.allTogether' | transloco), n: bar.session }
              "
            />
          } @empty {
            <p class="card__empty">{{ 'dashboard.notStartedAny' | transloco }}</p>
          }
        </div>
        @if (all.change; as change) {
          <app-change-summary [change]="change" />
        }
      </section>
    }

    <ul class="domains">
      @for (summary of summaries(); track summary.domain.id) {
        <li>
          <section class="card card--domain" [style.--domain-color]="color(summary)">
            <h3 class="card__heading">
              <button type="button" class="card__head" (click)="openDomain.emit(summary.domain.id)">
                <span class="swatch" aria-hidden="true"></span>
                <span class="card__title">{{ summary.domain | domainName }}</span>
                <mat-icon svgIcon="chevron-right" aria-hidden="true" />
              </button>
            </h3>
            <p class="card__meta">{{ 'competencies.count' | plural: summary.competencies }}</p>
            <div class="bars">
              @for (bar of summary.bars; track bar.session) {
                <app-level-bar
                  [counts]="bar.counts"
                  [total]="bar.total"
                  [label]="'dashboard.sessionShort' | transloco: { n: bar.session }"
                  [caption]="
                    'dashboard.sessionCaption'
                      | transloco: { name: (summary.domain | domainName), n: bar.session }
                  "
                />
              } @empty {
                <p class="card__empty">{{ 'dashboard.notStartedAny' | transloco }}</p>
              }
            </div>
            @if (summary.change; as change) {
              <app-change-summary [change]="change" />
            }
          </section>
        </li>
      }
    </ul>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }
    .intro {
      margin: 0 0 var(--space-4);
      color: var(--color-text-muted);
    }
    .card {
      @include card;

      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      width: 100%;
      padding: var(--space-4);
      color: inherit;
      font: inherit;
      text-align: start;
    }
    .card--total {
      margin-bottom: var(--space-4);
      border-inline-start: 6px solid var(--color-text-strong);
    }
    .card--domain {
      height: 100%;
      border-inline-start: 6px solid var(--domain-color);
    }
    .card__heading {
      margin: 0;
    }
    // The domain's name opens its competencies (the bars keep their own tooltips).
    .card__head {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      min-height: var(--touch-target);
      margin: calc(var(--space-2) * -1) 0 0;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;

      &:hover .card__title {
        text-decoration: underline;
        text-decoration-color: var(--domain-color);
        text-decoration-thickness: 2px;
        text-underline-offset: 4px;
      }

      mat-icon {
        flex: none;
        margin-inline-start: auto;
        color: var(--color-text-muted);
      }
    }
    .card__title {
      margin: 0;
      color: var(--color-text-strong);
      font-size: var(--text-base);
      font-weight: 700;
    }
    .card__meta,
    .card__empty {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    // The heading's button is a full touch target; keep its count close to it.
    .card__heading + .card__meta {
      margin-top: calc(var(--space-2) * -1);
    }
    .swatch {
      flex: none;
      width: 14px;
      height: 14px;
      border-radius: 4px;
      background: var(--domain-color);
    }
    .bars {
      display: grid;
      gap: var(--space-2);
      margin-block: var(--space-1);
    }
    .domains {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      margin: 0;
      padding: 0;
      list-style: none;

      @include up(lg) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverview {
  readonly summaries = input.required<DomainSummary[]>();
  /** All the chosen domains added up. */
  readonly total = input.required<CombinedSummary | null>();
  readonly openDomain = output<number>();

  protected color(summary: DomainSummary): string {
    return domainColors(summary.domain.slug).color;
  }
}
