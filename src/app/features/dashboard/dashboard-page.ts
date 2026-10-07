import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { from, forkJoin, map, mergeMap, of, switchMap, toArray } from 'rxjs';

import { AssessmentApi } from '@core/api/assessment-api';
import { ChildApi } from '@core/api/child-api';
import { CompetencyApi } from '@core/api/competency-api';
import { AccessService } from '@core/auth/access';
import { SessionStore } from '@core/auth/session';
import { CatalogText } from '@core/catalog/catalog-text';
import { domainColors } from '@core/catalog/framework';
import { LanguageService } from '@core/i18n/language';
import type { ChildAssessmentRecord } from '@core/models/assessment';
import { LEVELS, type Level } from '@core/models/level';
import { NotifyService } from '@core/notify/notify';
import { formatIsoDate, toIsoDate } from '@core/util/dates';
import { createLoader } from '@shared/loader';
import { CompetencyNamePipe, DomainNamePipe } from '@shared/pipes/catalog-pipes';
import { CenterPicker } from '@shared/ui/center-picker';
import { ErrorState } from '@shared/ui/error-state';
import { LevelBadge } from '@shared/ui/level-badge';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { exportDashboard } from './dashboard-export';
import {
  type CompetencyRow,
  type DashboardData,
  type SessionFilter,
  buildRows,
  percent,
  summarize,
} from './dashboard-model';

/** Requests in flight at once when loading every competency's results. */
const CONCURRENCY = 4;

interface Segment {
  key: Level | 'other' | 'none';
  count: number;
  color: string;
  label: string;
}

@Component({
  selector: 'app-dashboard-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTooltipModule,
    TranslocoPipe,
    CompetencyNamePipe,
    DomainNamePipe,
    CenterPicker,
    ErrorState,
    LevelBadge,
    PageHeader,
    Skeleton,
    StateMessage,
  ],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage {
  private readonly competencyApi = inject(CompetencyApi);
  private readonly childApi = inject(ChildApi);
  private readonly assessmentApi = inject(AssessmentApi);
  private readonly session = inject(SessionStore);
  private readonly access = inject(AccessService);
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly catalog = inject(CatalogText);
  private readonly notify = inject(NotifyService);

  protected readonly levels = LEVELS;
  protected readonly sessionOptions: SessionFilter[] = ['latest', 1, 2, 3, 4];

  /** Workers see their own centre; administrators choose one of the centres they may see. */
  protected readonly isWorker = this.access.worksInOwnCenter;
  protected readonly pickedCenterId = signal<number | null>(null);
  protected readonly centerId = computed(() =>
    this.isWorker() ? this.access.ownCenterId() : this.pickedCenterId(),
  );

  protected readonly loader = createLoader(
    () => {
      const centerId = this.centerId();
      if (centerId === null) return of(null);
      return forkJoin({
        domains: this.competencyApi.domains(),
        children: this.childApi.listForCenter(centerId),
      }).pipe(
        switchMap(({ domains, children }) =>
          from(domains.flatMap((d) => d.competencies)).pipe(
            mergeMap(
              (c) =>
                this.assessmentApi
                  .forCompetency(centerId, c.id)
                  .pipe(map((records): [number, ChildAssessmentRecord[]] => [c.id, records])),
              CONCURRENCY,
            ),
            toArray(),
            map((entries): DashboardData => ({ domains, children, records: new Map(entries) })),
          ),
        ),
      );
    },
    { lazy: true },
  );

  protected readonly domainFilter = signal<number | null>(null);
  protected readonly sessionFilter = signal<SessionFilter>('latest');
  protected readonly showTable = signal(false);
  protected readonly expanded = signal<number | null>(null);
  protected readonly exporting = signal(false);

  protected readonly data = computed(() => this.loader.data() ?? null);

  protected readonly centerName = computed(() => {
    const data = this.data();
    const fromChild = data?.children.find((c) => c.centerName)?.centerName;
    return this.session.user()?.anganwadi?.name ?? fromChild ?? null;
  });

  /** Tiles above the filters describe the whole centre (latest results, every domain). */
  protected readonly overall = computed(() => {
    const data = this.data();
    if (!data) return null;
    const summary = summarize(data.children, buildRows(data, 'latest', null));
    return {
      ...summary,
      sessionsPercent: percent(summary.sessionsDone, summary.sessionsPossible),
      readyPercent: percent(summary.counts.schoolReady, summary.results),
    };
  });

  protected readonly rows = computed(() => {
    const data = this.data();
    return data ? buildRows(data, this.sessionFilter(), this.domainFilter()) : [];
  });

  protected readonly groups = computed(() => {
    const groups: {
      domainId: number;
      domain: CompetencyRow['domain'];
      color: string;
      rows: CompetencyRow[];
    }[] = [];
    for (const row of this.rows()) {
      let group = groups.find((g) => g.domainId === row.domain.id);
      if (!group) {
        group = {
          domainId: row.domain.id,
          domain: row.domain,
          color: domainColors(row.domain.slug).color,
          rows: [],
        };
        groups.push(group);
      }
      group.rows.push(row);
    }
    return groups;
  });

  constructor() {
    effect(() => {
      const centerId = this.centerId();
      untracked(() => {
        if (centerId !== null) this.loader.reload();
      });
    });
  }

  protected sessionLabel(option: SessionFilter): string {
    this.language.current();
    return option === 'latest'
      ? this.transloco.translate('dashboard.sessionLatest')
      : this.transloco.translate('assessment.sessionN', { n: option });
  }

  protected segments(row: CompetencyRow): Segment[] {
    this.language.current();
    const segments: Segment[] = LEVELS.map((level) => ({
      key: level,
      count: row.counts[level],
      color: `var(--chart-level-${level})`,
      label: this.transloco.translate(`levels.${level}.label`),
    }));
    segments.push(
      {
        key: 'other',
        count: row.other,
        color: 'var(--chart-other)',
        label: this.transloco.translate('dashboard.otherResult'),
      },
      {
        key: 'none',
        count: row.notAssessed,
        color: 'var(--chart-none)',
        label: this.transloco.translate('dashboard.notAssessed'),
      },
    );
    return segments.filter((s) => s.count > 0);
  }

  protected tooltip(segment: Segment, row: CompetencyRow): string {
    return this.transloco.translate('dashboard.segmentTooltip', {
      count: segment.count,
      percent: percent(segment.count, row.total),
      level: segment.label,
    });
  }

  protected barLabel(row: CompetencyRow): string {
    return this.segments(row)
      .map((s) => `${s.label}: ${s.count}`)
      .join(', ');
  }

  protected childrenAt(row: CompetencyRow, level: Level | null): string[] {
    return row.children
      .filter((c) => (level === null ? !c.result?.level : c.result?.level === level))
      .map((c) => c.child.name)
      .sort((a, b) => a.localeCompare(b));
  }

  protected toggle(id: number): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  protected async export(): Promise<void> {
    const data = this.data();
    if (!data || this.exporting()) return;
    this.exporting.set(true);
    const locale = this.language.locale();
    const domain = data.domains.find((d) => d.id === this.domainFilter());
    try {
      await exportDashboard(
        {
          centerName: this.centerName() ?? this.transloco.translate('dashboard.export.center'),
          filters: {
            domain: domain
              ? this.catalog.domainName(domain)
              : this.transloco.translate('dashboard.allDomains'),
            session: this.sessionLabel(this.sessionFilter()),
          },
          summary: summarize(data.children, this.rows()),
          rows: this.rows(),
          children: data.children,
          today: toIsoDate(),
        },
        {
          t: (key, params) => this.transloco.translate(key, params),
          competencyName: (row) => this.catalog.competencyName(row.competency),
          domainName: (row) => this.catalog.domainName(row.domain),
          formatDate: (iso) => (iso ? formatIsoDate(iso, locale, 'medium') : ''),
        },
      );
      this.notify.success('dashboard.exported');
    } catch (error) {
      console.error(error);
      this.notify.errorKey('dashboard.exportFailed');
    } finally {
      this.exporting.set(false);
    }
  }
}
