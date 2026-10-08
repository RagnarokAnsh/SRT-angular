import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { CatalogText } from '@core/catalog/catalog-text';
import { LanguageService } from '@core/i18n/language';
import { CompetencyNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';

import { type AttentionItem, type StudentAttention, standingOf } from '../dashboard-model';
import { NameChip } from '../parts/name-chip';
import { STANDING_MARK, STANDING_TINT, standingLabelKey } from '../parts/standings';

/**
 * Which student needs support in which competency: their level went down or stayed the same
 * since their session before, or they weren't assessed in the latest session the others had.
 */
@Component({
  selector: 'app-dashboard-attention',
  imports: [MatIconModule, TranslocoPipe, CompetencyNamePipe, PluralPipe, NameChip],
  template: `
    <p class="intro">{{ 'dashboard.attention.subtitle' | transloco }}</p>

    <ul class="students">
      @for (entry of view(); track entry.student.child.id) {
        <li class="student">
          <div class="student__head">
            <app-name-chip
              [name]="entry.student.child.name"
              [standing]="entry.student.overall ?? 'none'"
            />
            <span class="counts">
              @if (entry.counts.down) {
                <span class="count count--down">
                  <mat-icon svgIcon="arrow-down" aria-hidden="true" />
                  {{ 'dashboard.attention.countDown' | plural: entry.counts.down }}
                </span>
              }
              @if (entry.counts.same) {
                <span class="count">
                  <mat-icon svgIcon="arrow-right" aria-hidden="true" />
                  {{ 'dashboard.attention.countSame' | plural: entry.counts.same }}
                </span>
              }
              @if (entry.counts.none) {
                <span class="count">
                  <mat-icon svgIcon="pending" aria-hidden="true" />
                  {{ 'dashboard.attention.countNone' | plural: entry.counts.none }}
                </span>
              }
            </span>
          </div>

          @if (entry.changed.length) {
            <ul class="items">
              @for (row of entry.changed; track row.item.competency.id) {
                @let change = row.item.change!;
                <li class="item">
                  <div class="item__top">
                    <span class="item__name">{{ row.item.competency | competencyName }}</span>
                    <span class="reason" [class.reason--down]="row.reason === 'down'">
                      <mat-icon
                        [svgIcon]="row.reason === 'down' ? 'arrow-down' : 'arrow-right'"
                        aria-hidden="true"
                      />
                      {{ 'dashboard.attention.reason.' + row.reason | transloco }}
                    </span>
                  </div>
                  <div class="item__detail">
                    @if (row.reason === 'down') {
                      <span class="step">
                        <span class="sessions">{{
                          'dashboard.sessionShort' | transloco: { n: change.from.session }
                        }}</span>
                        <span class="pill" [style.background]="tint[standingOf(change.from)]">
                          <span class="pill__mark" aria-hidden="true">{{
                            mark[standingOf(change.from)]
                          }}</span>
                          {{ labelKey(standingOf(change.from)) | transloco }}
                        </span>
                      </span>
                      <mat-icon class="to" svgIcon="arrow-right" aria-hidden="true" />
                      <span class="visually-hidden">→</span>
                      <span class="step">
                        <span class="sessions">{{
                          'dashboard.sessionShort' | transloco: { n: change.to.session }
                        }}</span>
                        <span class="pill" [style.background]="tint[standingOf(change.to)]">
                          <span class="pill__mark" aria-hidden="true">{{
                            mark[standingOf(change.to)]
                          }}</span>
                          {{ labelKey(standingOf(change.to)) | transloco }}
                        </span>
                      </span>
                    } @else {
                      <span class="step">
                        <span class="sessions">
                          {{ 'dashboard.sessionShort' | transloco: { n: change.from.session } }},
                          {{ 'dashboard.sessionShort' | transloco: { n: change.to.session } }}
                        </span>
                        <span class="pill" [style.background]="tint[standingOf(change.to)]">
                          <span class="pill__mark" aria-hidden="true">{{
                            mark[standingOf(change.to)]
                          }}</span>
                          {{ labelKey(standingOf(change.to)) | transloco }}
                        </span>
                      </span>
                    }
                  </div>
                </li>
              }
            </ul>
          }
          @if (entry.notAssessed; as names) {
            <p class="missing">
              <span class="reason">
                <mat-icon svgIcon="pending" aria-hidden="true" />
                {{ 'dashboard.attention.reason.none' | transloco }}:
              </span>
              {{ names }}
            </p>
          }
        </li>
      } @empty {
        <li class="empty">
          <mat-icon svgIcon="check-circle" aria-hidden="true" />
          {{ 'dashboard.attention.empty' | transloco }}
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
    .students {
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
    .student {
      @include card;

      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
    }
    .student__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
    }
    .counts {
      display: inline-flex;
      flex-wrap: wrap;
      gap: var(--space-1) var(--space-3);
      color: var(--color-text);
      font-size: var(--text-sm);
    }
    .count {
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
    .count--down mat-icon {
      color: var(--color-danger);
    }
    .items {
      display: grid;
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-md);
      background: var(--color-surface-muted);
    }
    .item__top {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 2px var(--space-3);
    }
    .item__name {
      color: var(--color-text-strong);
      font-weight: 600;
    }
    .item__detail {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 6px;
      font-size: var(--text-sm);
    }
    // A session and its level stay together when the line wraps.
    .step {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .reason {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: var(--color-text);
      font-size: var(--text-sm);
      font-weight: 600;

      mat-icon {
        width: 18px;
        height: 18px;
        color: var(--color-text-muted);
      }
    }
    .reason--down mat-icon {
      color: var(--color-danger);
    }
    .pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 8px 1px 3px;
      border-radius: var(--radius-pill);
      color: var(--level-text);
      font-weight: 600;
    }
    .pill__mark {
      display: grid;
      place-items: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgb(255 255 255 / 70%);
      font-size: 0.7rem;
      font-weight: 700;
    }
    .sessions {
      color: var(--color-text-muted);
    }
    .to {
      width: 16px;
      height: 16px;
      color: var(--color-text-muted);
    }
    .missing {
      margin: 0;
      color: var(--color-text);
      font-size: var(--text-sm);
    }
    .empty {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-6);
      color: var(--color-text-muted);

      mat-icon {
        color: var(--color-success);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardAttention {
  private readonly catalog = inject(CatalogText);
  private readonly language = inject(LanguageService);
  private readonly transloco = inject(TranslocoService);

  readonly attention = input.required<StudentAttention[]>();

  protected readonly tint = STANDING_TINT;
  protected readonly mark = STANDING_MARK;
  protected readonly labelKey = standingLabelKey;
  protected readonly standingOf = standingOf;

  /** Changes listed one by one; missed sessions as one line: "Patterns (S2), Seriation (S1)". */
  protected readonly view = computed(() => {
    this.language.current();
    return this.attention().map((entry) => ({
      ...entry,
      changed: entry.items.filter((i): i is AttentionItem => i.reason !== 'none'),
      notAssessed: entry.items
        .filter((i) => i.reason === 'none')
        .map(
          (i) =>
            `${this.catalog.competencyName(i.item.competency)} (${this.transloco.translate(
              'dashboard.sessionShort',
              { n: i.item.missed },
            )})`,
        )
        .join(', '),
    }));
  });
}
