import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { domainColors } from '@core/catalog/framework';
import type { SessionNumber } from '@core/models/assessment';
import type { Domain } from '@core/models/competency';
import { CompetencyNamePipe, DomainNamePipe } from '@shared/pipes/catalog-pipes';

import { type CompetencyView, STANDINGS } from '../dashboard-model';
import { ChangeSummary } from '../parts/change-summary';
import { LevelBar } from '../parts/level-bar';
import { NameChip } from '../parts/name-chip';
import { standingLabelKey } from '../parts/standings';

/**
 * Competency by competency: a bar per chosen session (so sessions sit side by side), how the
 * students changed since their session before, and their names at each level.
 */
@Component({
  selector: 'app-dashboard-competencies',
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    TranslocoPipe,
    CompetencyNamePipe,
    DomainNamePipe,
    ChangeSummary,
    LevelBar,
    NameChip,
  ],
  template: `
    <div class="head">
      <p class="intro">{{ 'dashboard.competenciesView.subtitle' | transloco }}</p>
      <button mat-button type="button" (click)="showTable.set(!showTable())">
        <mat-icon [svgIcon]="showTable() ? 'chart' : 'notes'" aria-hidden="true" />
        {{ (showTable() ? 'dashboard.showChart' : 'dashboard.showTable') | transloco }}
      </button>
    </div>

    @if (showTable()) {
      <div class="table-wrap">
        <table class="data-table">
          <caption class="visually-hidden">
            {{
              'dashboard.chartTitle' | transloco
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ 'dashboard.table.competency' | transloco }}</th>
              <th scope="col">{{ 'dashboard.table.session' | transloco }}</th>
              @for (standing of standings; track standing) {
                <th scope="col" class="num">{{ labelKey(standing) | transloco }}</th>
              }
              <th scope="col" class="num">{{ 'dashboard.table.total' | transloco }}</th>
            </tr>
          </thead>
          <tbody>
            @for (view of views(); track view.competency.id) {
              @for (bar of view.bars; track bar.session; let first = $first) {
                <tr>
                  @if (first) {
                    <th scope="row" [attr.rowspan]="view.bars.length">
                      {{ view.competency | competencyName }}
                    </th>
                  }
                  <td>{{ 'dashboard.sessionShort' | transloco: { n: bar.session } }}</td>
                  @for (standing of standings; track standing) {
                    <td class="num">{{ bar.counts[standing] }}</td>
                  }
                  <td class="num">{{ bar.total }}</td>
                </tr>
              }
            }
          </tbody>
        </table>
      </div>
    } @else {
      @for (group of groups(); track group.domain.id) {
        <section class="group" [style.--domain-color]="group.color">
          <h3 class="group__title">
            <span class="swatch" aria-hidden="true"></span>
            {{ group.domain | domainName }}
          </h3>
          <ul class="list">
            @for (view of group.views; track view.competency.id) {
              <li class="item">
                <div class="item__head">
                  <a class="item__name" [routerLink]="['/competencies', view.competency.id]">
                    {{ view.competency | competencyName }}
                  </a>
                  @if (view.started.length) {
                    <button
                      mat-button
                      type="button"
                      class="item__toggle"
                      [attr.aria-expanded]="open().has(view.competency.id)"
                      (click)="toggle(view.competency.id)"
                    >
                      {{
                        (open().has(view.competency.id)
                          ? 'dashboard.competenciesView.hideNames'
                          : 'dashboard.competenciesView.showNames'
                        ) | transloco
                      }}
                      <mat-icon
                        [svgIcon]="open().has(view.competency.id) ? 'chevron-up' : 'chevron-down'"
                        iconPositionEnd
                        aria-hidden="true"
                      />
                    </button>
                  }
                </div>
                @if (view.started.length) {
                  <div class="bars">
                    @for (bar of view.started; track bar.session) {
                      <app-level-bar
                        [counts]="bar.counts"
                        [total]="bar.total"
                        [label]="'dashboard.sessionShort' | transloco: { n: bar.session }"
                        [caption]="
                          'dashboard.sessionCaption'
                            | transloco
                              : { name: (view.competency | competencyName), n: bar.session }
                        "
                      />
                    }
                  </div>
                  @if (view.notStarted.length) {
                    <p class="note">
                      {{
                        'dashboard.competenciesView.notStarted'
                          | transloco: { sessions: sessionList(view.notStarted) }
                      }}
                    </p>
                  }
                  @if (view.change; as change) {
                    <app-change-summary [change]="change" />
                  }
                } @else {
                  <p class="note">{{ 'dashboard.competenciesView.noneYet' | transloco }}</p>
                }
                @if (open().has(view.competency.id)) {
                  <div class="names">
                    @for (bar of view.started; track bar.session) {
                      <div class="names__session">
                        <h4 class="names__title">
                          {{ 'assessment.sessionN' | transloco: { n: bar.session } }}
                        </h4>
                        @for (standing of standings; track standing) {
                          @if (bar.names[standing].length) {
                            <ul class="chips" [attr.aria-label]="labelKey(standing) | transloco">
                              @for (name of bar.names[standing]; track $index) {
                                <li><app-name-chip [name]="name" [standing]="standing" /></li>
                              }
                            </ul>
                          }
                        }
                      </div>
                    }
                  </div>
                }
              </li>
            }
          </ul>
        </section>
      }
    }
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      margin-bottom: var(--space-3);
    }
    .intro {
      flex: 1 1 260px;
      margin: 0;
      color: var(--color-text-muted);
    }
    .group {
      margin-bottom: var(--space-6);
    }
    .group__title {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      margin: 0 0 var(--space-3);
      font-size: var(--text-lg);
    }
    .swatch {
      flex: none;
      width: 14px;
      height: 14px;
      border-radius: 4px;
      background: var(--domain-color);
    }
    .list {
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
    .item {
      @include card;

      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4) var(--space-4);
      border-inline-start: 6px solid var(--domain-color);
    }
    .item__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-1) var(--space-2);
    }
    .item__name {
      color: var(--color-text-strong);
      font-weight: 700;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
    .item__toggle {
      margin-inline-end: calc(var(--space-2) * -1);
    }
    .bars {
      display: grid;
      gap: var(--space-2);
    }
    .note {
      margin: 0;
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .names {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-3);
      margin-top: var(--space-2);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);

      @include up(sm) {
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      }
    }
    .names__title {
      margin: 0 0 var(--space-2);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin: 0 0 6px;
      padding: 0;
      list-style: none;

      li {
        max-width: 100%;
      }
    }
    .table-wrap {
      overflow-x: auto;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardCompetencies {
  private readonly transloco = inject(TranslocoService);

  readonly views = input.required<CompetencyView[]>();

  protected readonly standings = STANDINGS;
  protected readonly labelKey = standingLabelKey;
  protected readonly showTable = signal(false);
  protected readonly open = signal<ReadonlySet<number>>(new Set());

  /** "S2, S3" */
  protected sessionList(sessions: readonly SessionNumber[]): string {
    return sessions
      .map((n) => this.transloco.translate('dashboard.sessionShort', { n }))
      .join(', ');
  }

  protected readonly groups = computed(() => {
    const groups: { domain: Domain; color: string; views: CompetencyView[] }[] = [];
    for (const view of this.views()) {
      let group = groups.find((g) => g.domain.id === view.domain.id);
      if (!group) {
        group = { domain: view.domain, color: domainColors(view.domain.slug).color, views: [] };
        groups.push(group);
      }
      group.views.push(view);
    }
    return groups;
  });

  protected toggle(id: number): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}
