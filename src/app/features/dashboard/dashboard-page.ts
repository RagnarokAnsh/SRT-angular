import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';
import { from, forkJoin, map, mergeMap, of, switchMap, toArray } from 'rxjs';

import { AssessmentApi } from '@core/api/assessment-api';
import { ChildApi } from '@core/api/child-api';
import { CompetencyApi } from '@core/api/competency-api';
import { AccessService } from '@core/auth/access';
import { SessionStore } from '@core/auth/session';
import { CatalogText } from '@core/catalog/catalog-text';
import { LanguageService } from '@core/i18n/language';
import {
  type ChildAssessmentRecord,
  SESSION_NUMBERS,
  type SessionNumber,
} from '@core/models/assessment';
import type { ApiCenter } from '@core/models/center';
import { NotifyService } from '@core/notify/notify';
import { formatIsoDate, toIsoDate } from '@core/util/dates';
import { createLoader } from '@shared/loader';
import { CompetencyNamePipe, DomainNamePipe } from '@shared/pipes/catalog-pipes';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { CenterPicker } from '@shared/ui/center-picker';
import { ErrorState } from '@shared/ui/error-state';
import { PageHeader } from '@shared/ui/page-header';
import { Skeleton } from '@shared/ui/skeleton';
import { StateMessage } from '@shared/ui/state-message';

import { exportDashboard } from './dashboard-export';
import {
  type DashboardData,
  type DashboardFilter,
  STANDINGS,
  type Standing,
  buildRows,
  combine,
  competencyViews,
  domainSummaries,
  needsAttention,
  percent,
  sessionsWithResults,
  studentViews,
  summarize,
} from './dashboard-model';
import { STANDING_COLOR, STANDING_MARK, standingLabelKey } from './parts/standings';
import { DashboardAttention } from './views/attention-view';
import { DashboardCompetencies } from './views/competencies-view';
import { DashboardOverview } from './views/overview-view';
import { DashboardStudents } from './views/students-view';

/** Requests in flight at once when loading every competency's results. */
const CONCURRENCY = 4;

const VIEWS = ['overview', 'competencies', 'students', 'attention'] as const;
type View = (typeof VIEWS)[number];

const VIEW_TABS: readonly { id: View; label: string; icon: string }[] = [
  { id: 'overview', label: 'dashboard.tabs.overview', icon: 'chart-box' },
  { id: 'competencies', label: 'dashboard.tabs.competencies', icon: 'chart' },
  { id: 'students', label: 'dashboard.tabs.students', icon: 'children' },
  { id: 'attention', label: 'dashboard.tabs.attention', icon: 'warning' },
];

/**
 * The centre's dashboard: overall figures, then one set of filters (domain, competencies,
 * sessions) for four views: every domain, competency by competency with sessions side by
 * side, student by student, and who needs attention.
 */
@Component({
  selector: 'app-dashboard-page',
  imports: [
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    TranslocoPipe,
    CompetencyNamePipe,
    DomainNamePipe,
    PluralPipe,
    CenterPicker,
    ErrorState,
    PageHeader,
    Skeleton,
    StateMessage,
    DashboardOverview,
    DashboardCompetencies,
    DashboardStudents,
    DashboardAttention,
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
  private readonly router = inject(Router);

  /** Query parameter: which view is open (so Back and shared links keep it). */
  readonly view = input<string>();

  private readonly viewsNav = viewChild<ElementRef<HTMLElement>>('viewsNav');

  protected readonly viewTabs = VIEW_TABS;
  protected readonly sessionNumbers = SESSION_NUMBERS;
  protected readonly standings = STANDINGS;
  protected readonly standingColor = STANDING_COLOR;
  protected readonly standingMark = STANDING_MARK;
  protected readonly standingLabel = standingLabelKey;

  /** Workers see their own centre; administrators choose one of the centres they may see. */
  protected readonly isWorker = this.access.worksInOwnCenter;
  protected readonly pickedCenter = signal<ApiCenter | null>(null);
  protected readonly centerId = computed(() =>
    this.isWorker() ? this.access.ownCenterId() : (this.pickedCenter()?.id ?? null),
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

  protected readonly data = computed(() => this.loader.data() ?? null);
  protected readonly exporting = signal(false);

  /** The centre shown: the worker's own, or the one an administrator chose. */
  protected readonly centerName = computed(() => {
    if (!this.isWorker()) return this.pickedCenter()?.name ?? null;
    const fromChild = this.data()?.children.find((c) => c.centerName)?.centerName;
    return this.session.user()?.anganwadi?.name ?? fromChild ?? null;
  });

  // Filters: one row above the views; they scope all of them.

  protected readonly domainFilter = signal<number | null>(null);
  protected readonly competencyFilter = signal<number[]>([]);
  /** Sessions that have results; the chosen ones default to these. */
  protected readonly availableSessions = computed(() => {
    const data = this.data();
    return data ? sessionsWithResults(data) : [];
  });
  protected readonly chosenSessions = linkedSignal<SessionNumber[]>(() => {
    const available = this.availableSessions();
    return available.length ? available : [1];
  });
  protected readonly filter = computed<DashboardFilter>(() => ({
    domainId: this.domainFilter(),
    competencyIds: this.competencyFilter(),
    sessions: this.chosenSessions(),
  }));
  /** The chosen domain's competencies, for the competency filter. */
  protected readonly domainCompetencies = computed(() => {
    const id = this.domainFilter();
    return this.data()?.domains.find((d) => d.id === id)?.competencies ?? [];
  });

  protected readonly competencyViews = computed(() => {
    const data = this.data();
    return data ? competencyViews(data, this.filter()) : [];
  });
  protected readonly domainSummaries = computed(() => domainSummaries(this.competencyViews()));
  protected readonly overallSummary = computed(() => {
    const views = this.competencyViews();
    return views.length ? combine(views) : null;
  });
  protected readonly students = computed(() => {
    const data = this.data();
    return data ? studentViews(data, this.filter()) : [];
  });
  protected readonly attention = computed(() => needsAttention(this.students()));
  /** Results stored with a value that isn't a level (older data): only then in the legend. */
  protected readonly hasOther = computed(() =>
    this.competencyViews().some((v) => v.bars.some((b) => b.counts.other > 0)),
  );
  protected readonly legend = computed(() =>
    STANDINGS.filter((s: Standing) => s !== 'other' || this.hasOther()),
  );

  /** Tiles above the filters describe the whole centre (latest results, every domain). */
  protected readonly overall = computed(() => {
    const data = this.data();
    if (!data) return null;
    const summary = summarize(data.children, buildRows(data, 'latest', null));
    const everyone = studentViews(data, {
      domainId: null,
      competencyIds: [],
      sessions: SESSION_NUMBERS,
    });
    return {
      ...summary,
      sessionsPercent: percent(summary.sessionsDone, summary.sessionsPossible),
      readyPercent: percent(summary.counts.schoolReady, summary.results),
      needSupport: needsAttention(everyone).length,
    };
  });

  protected readonly viewIndex = computed(() =>
    Math.max(0, VIEWS.indexOf((this.view() ?? 'overview') as View)),
  );

  constructor() {
    effect(() => {
      const centerId = this.centerId();
      untracked(() => {
        // Never show (or export) the previous centre's figures under the new centre's name.
        this.loader.clear();
        if (centerId !== null) this.loader.reload();
      });
    });
  }

  /** Switches the view in place; `reveal` brings it into sight when chosen from further up. */
  protected selectView(index: number, reveal = false): void {
    void this.router
      .navigate([], {
        queryParams: { view: index === 0 ? null : VIEWS[index] },
        queryParamsHandling: 'merge',
        replaceUrl: true,
        scroll: 'manual',
      })
      .then(() => {
        if (reveal) this.viewsNav()?.nativeElement.scrollIntoView({ block: 'start' });
      });
  }

  protected setDomain(id: number | null): void {
    this.domainFilter.set(id);
    this.competencyFilter.set([]);
  }

  /** From the overview: that domain's competencies. */
  protected openDomain(id: number): void {
    this.setDomain(id);
    this.selectView(VIEWS.indexOf('competencies'), true);
  }

  /** At least one session stays chosen. */
  protected setSessions(value: SessionNumber[] | null): void {
    const sessions = [...(value ?? [])].sort((a, b) => a - b);
    this.chosenSessions.set(sessions.length ? sessions : [...this.chosenSessions()]);
  }

  protected async export(): Promise<void> {
    const data = this.data();
    if (!data || this.exporting()) return;
    this.exporting.set(true);
    const locale = this.language.locale();
    const domain = data.domains.find((d) => d.id === this.domainFilter());
    const rows = buildRows(data, 'latest', this.domainFilter());
    try {
      await exportDashboard(
        {
          centerName: this.centerName() ?? this.transloco.translate('dashboard.export.center'),
          filters: {
            domain: domain
              ? this.catalog.domainName(domain)
              : this.transloco.translate('dashboard.allDomains'),
            session: this.transloco.translate('dashboard.sessionLatest'),
          },
          summary: summarize(data.children, rows),
          rows,
          children: data.children,
          attention: needsAttention(
            studentViews(data, {
              domainId: this.domainFilter(),
              competencyIds: [],
              sessions: SESSION_NUMBERS,
            }),
          ),
          today: toIsoDate(),
        },
        {
          t: (key, params) => this.transloco.translate(key, params),
          competencyName: (competency) => this.catalog.competencyName(competency),
          domainName: (domain) => this.catalog.domainName(domain),
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
