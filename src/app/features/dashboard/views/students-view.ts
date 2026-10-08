import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslocoPipe } from '@jsverse/transloco';

import { domainColors } from '@core/catalog/framework';
import type { SessionNumber } from '@core/models/assessment';
import type { Domain } from '@core/models/competency';
import { searchable } from '@core/util/text';
import { CompetencyNamePipe, DomainNamePipe } from '@shared/pipes/catalog-pipes';

import { type StudentCompetency, type StudentView, standingOf } from '../dashboard-model';
import { NameChip } from '../parts/name-chip';
import { STANDING_MARK, STANDING_TINT, standingLabelKey } from '../parts/standings';

/**
 * Student by student: their level in every competency, session after session, and whether it
 * went up, stayed or went down since the session before.
 */
@Component({
  selector: 'app-dashboard-students',
  imports: [
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TranslocoPipe,
    CompetencyNamePipe,
    DomainNamePipe,
    NameChip,
  ],
  template: `
    <p class="intro">{{ 'dashboard.studentsView.subtitle' | transloco }}</p>
    <mat-form-field class="search">
      <mat-label>{{ 'dashboard.studentsView.search' | transloco }}</mat-label>
      <mat-icon matPrefix svgIcon="search" aria-hidden="true" />
      <input
        matInput
        type="search"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    </mat-form-field>

    <ul class="students">
      @for (student of visible(); track student.child.id) {
        <li class="student">
          <button
            type="button"
            class="student__head"
            [attr.aria-expanded]="open().has(student.child.id)"
            (click)="toggle(student.child.id)"
          >
            <app-name-chip [name]="student.child.name" [standing]="student.overall ?? 'none'" />
            <span class="student__meta">
              {{
                'dashboard.studentsView.assessedOf'
                  | transloco: { assessed: student.assessed, total: student.items.length }
              }}
              @if (student.changes.up) {
                <span class="tag tag--up">
                  <mat-icon svgIcon="arrow-up" aria-hidden="true" />
                  {{ 'dashboard.change.up' | transloco: { count: student.changes.up } }}
                </span>
              }
              @if (student.changes.down) {
                <span class="tag tag--down">
                  <mat-icon svgIcon="arrow-down" aria-hidden="true" />
                  {{ 'dashboard.change.down' | transloco: { count: student.changes.down } }}
                </span>
              }
            </span>
            <mat-icon
              class="student__chevron"
              [svgIcon]="open().has(student.child.id) ? 'chevron-up' : 'chevron-down'"
              aria-hidden="true"
            />
          </button>

          @if (open().has(student.child.id)) {
            <div class="grid-wrap">
              <table class="grid">
                <caption class="visually-hidden">
                  {{
                    student.child.name
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ 'dashboard.table.competency' | transloco }}</th>
                    @for (n of sessions(); track n) {
                      <th scope="col" class="cell-col">
                        <span aria-hidden="true">{{
                          'dashboard.sessionShort' | transloco: { n }
                        }}</span>
                        <span class="visually-hidden">{{
                          'assessment.sessionN' | transloco: { n }
                        }}</span>
                      </th>
                    }
                    <th scope="col" class="cell-col">
                      <span class="visually-hidden">{{
                        'dashboard.studentsView.change' | transloco
                      }}</span>
                    </th>
                  </tr>
                </thead>
                @for (group of groupsOf(student); track group.domain.id) {
                  <tbody>
                    <tr class="domain-row">
                      <th scope="colgroup" [attr.colspan]="sessions().length + 2">
                        <span
                          class="swatch"
                          [style.background]="group.color"
                          aria-hidden="true"
                        ></span>
                        {{ group.domain | domainName }}
                      </th>
                    </tr>
                    @for (item of group.items; track item.competency.id) {
                      <tr>
                        <th scope="row" class="competency">
                          {{ item.competency | competencyName }}
                        </th>
                        @for (n of sessions(); track n) {
                          @let standing = standingAt(item, n);
                          <td class="cell-col">
                            <span
                              class="cell"
                              [style.background]="tint[standing]"
                              [attr.title]="labelKey(standing) | transloco"
                              aria-hidden="true"
                              >{{ mark[standing] }}</span
                            >
                            <span class="visually-hidden">{{
                              labelKey(standing) | transloco
                            }}</span>
                          </td>
                        }
                        <td class="cell-col">
                          @if (item.change; as change) {
                            <mat-icon
                              class="trend"
                              [class.trend--up]="change.change === 'up'"
                              [class.trend--down]="change.change === 'down'"
                              [svgIcon]="trendIcon[change.change]"
                              aria-hidden="true"
                            />
                            <span class="visually-hidden">{{
                              'dashboard.studentsView.trend.' + change.change | transloco
                            }}</span>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                }
              </table>
            </div>
          }
        </li>
      } @empty {
        <li class="empty">{{ 'dashboard.studentsView.noMatch' | transloco }}</li>
      }
    </ul>
  `,
  styles: `
    @use 'mixins' as *;

    :host {
      display: block;
    }
    .intro {
      margin: 0 0 var(--space-3);
      color: var(--color-text-muted);
    }
    .search {
      width: 100%;
      max-width: 360px;
      margin-bottom: var(--space-2);
    }
    .students {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--space-2);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .student {
      @include card;

      overflow: hidden;
    }
    .student__head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-3);
      width: 100%;
      min-height: 56px;
      padding: var(--space-2) var(--space-3);
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;

      &:hover {
        background: var(--color-surface-muted);
      }
    }
    .student__meta {
      display: inline-flex;
      flex: 1 1 200px;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-1) var(--space-3);
      color: var(--color-text-muted);
      font-size: var(--text-sm);
    }
    .student__chevron {
      flex: none;
      margin-inline-start: auto;
      color: var(--color-text-muted);
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 2px;
      color: var(--color-text);
      white-space: nowrap;

      mat-icon {
        width: 18px;
        height: 18px;
      }
    }
    .tag--up mat-icon {
      color: var(--color-success);
    }
    .tag--down mat-icon {
      color: var(--color-danger);
    }
    .grid-wrap {
      overflow-x: auto;
      padding: 0 var(--space-3) var(--space-3);
    }
    .grid {
      width: 100%;
      border-collapse: collapse;
      font-size: var(--text-sm);

      th,
      td {
        padding: 4px 2px;
        text-align: start;
        vertical-align: middle;
      }

      thead th {
        color: var(--color-text-muted);
        font-weight: 600;
      }
    }
    .domain-row th {
      padding-top: var(--space-3);
      color: var(--color-text-strong);
      font-weight: 700;
    }
    .swatch {
      display: inline-block;
      width: 12px;
      height: 12px;
      margin-inline-end: 6px;
      border-radius: 3px;
      vertical-align: -1px;
    }
    .competency {
      min-width: 0;
      font-weight: 500;
    }
    .cell-col {
      width: 34px;
      text-align: center !important;
    }
    .cell {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      color: var(--level-text);
      font-weight: 700;
    }
    .trend {
      width: 20px;
      height: 20px;
      color: var(--color-text-muted);
    }
    .trend--up {
      color: var(--color-success);
    }
    .trend--down {
      color: var(--color-danger);
    }
    .empty {
      padding: var(--space-6);
      color: var(--color-text-muted);
      text-align: center;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardStudents {
  readonly students = input.required<StudentView[]>();
  readonly sessions = input.required<readonly SessionNumber[]>();

  protected readonly tint = STANDING_TINT;
  protected readonly mark = STANDING_MARK;
  protected readonly labelKey = standingLabelKey;
  protected readonly trendIcon = { up: 'arrow-up', same: 'arrow-right', down: 'arrow-down' };

  protected readonly query = signal('');
  protected readonly open = signal<ReadonlySet<number>>(new Set());

  protected readonly visible = computed(() => {
    const needle = searchable(this.query());
    return this.students().filter((s) => !needle || searchable(s.child.name).includes(needle));
  });

  protected standingAt(item: StudentCompetency, session: SessionNumber) {
    return standingOf(item.sessions[session - 1]);
  }

  protected groupsOf(student: StudentView) {
    const groups: { domain: Domain; color: string; items: StudentCompetency[] }[] = [];
    for (const item of student.items) {
      let group = groups.find((g) => g.domain.id === item.domain.id);
      if (!group) {
        group = { domain: item.domain, color: domainColors(item.domain.slug).color, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    }
    return groups;
  }

  protected toggle(id: number): void {
    this.open.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}
