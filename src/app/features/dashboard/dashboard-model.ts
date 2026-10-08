import { type ChildProgress, MAX_SESSIONS, matchProgress } from '@core/assessment/progress';
import {
  type ChildAssessmentRecord,
  SESSION_NUMBERS,
  type SessionNumber,
  type SessionResult,
} from '@core/models/assessment';
import { type Child, toChildGender } from '@core/models/child';
import type { Competency, Domain } from '@core/models/competency';
import { LEVELS, type Level } from '@core/models/level';

/** Which result to count for each child: their most recent session, or one session. */
export type SessionFilter = 'latest' | SessionNumber;

export type LevelCounts = Record<Level, number>;

export interface ChildResult {
  child: Child;
  result: SessionResult | null;
}

export interface CompetencyRow {
  competency: Competency;
  domain: Domain;
  counts: LevelCounts;
  /** Results stored with a value that isn't one of the four levels. */
  other: number;
  notAssessed: number;
  total: number;
  children: ChildResult[];
  /** Every child's sessions (all sessions, not just the filtered one). */
  progress: ChildProgress[];
}

export interface DashboardData {
  domains: Domain[];
  children: Child[];
  /** Assessment rows per competency id. */
  records: ReadonlyMap<number, ChildAssessmentRecord[]>;
}

export function emptyCounts(): LevelCounts {
  return { beginning: 0, progressing: 0, advancing: 0, schoolReady: 0 };
}

export function resultFor(progress: ChildProgress, session: SessionFilter): SessionResult | null {
  if (session === 'latest') return progress.sessions[progress.sessions.length - 1] ?? null;
  return progress.sessions.find((s) => s.session === session) ?? null;
}

export function competencyRow(
  competency: Competency,
  domain: Domain,
  children: Child[],
  records: ChildAssessmentRecord[],
  session: SessionFilter,
): CompetencyRow {
  const progress = matchProgress(children, records);
  const counts = emptyCounts();
  let other = 0;
  let notAssessed = 0;
  const results: ChildResult[] = progress.map((p) => {
    const result = resultFor(p, session);
    if (!result) notAssessed++;
    else if (result.level) counts[result.level]++;
    else other++;
    return { child: p.child, result };
  });
  return {
    competency,
    domain,
    counts,
    other,
    notAssessed,
    total: children.length,
    children: results,
    progress,
  };
}

export function buildRows(
  data: DashboardData,
  session: SessionFilter,
  domainId: number | null,
): CompetencyRow[] {
  return data.domains
    .filter((domain) => domainId === null || domain.id === domainId)
    .flatMap((domain) =>
      domain.competencies.map((competency) =>
        competencyRow(
          competency,
          domain,
          data.children,
          data.records.get(competency.id) ?? [],
          session,
        ),
      ),
    );
}

export interface Summary {
  children: number;
  boys: number;
  girls: number;
  sessionsDone: number;
  sessionsPossible: number;
  /** Results counted across the rows (one per child and competency). */
  results: number;
  counts: LevelCounts;
}

export function summarize(children: Child[], rows: CompetencyRow[]): Summary {
  const counts = emptyCounts();
  let results = 0;
  let sessionsDone = 0;
  for (const row of rows) {
    for (const level of LEVELS) counts[level] += row.counts[level];
    results += row.total - row.notAssessed;
    sessionsDone += row.progress.reduce((sum, p) => sum + p.sessions.length, 0);
  }
  return {
    children: children.length,
    boys: children.filter((c) => toChildGender(c.gender) === 'Boy').length,
    girls: children.filter((c) => toChildGender(c.gender) === 'Girl').length,
    sessionsDone,
    sessionsPossible: children.length * rows.length * MAX_SESSIONS,
    results,
    counts,
  };
}

/** Share as a whole-number percentage (0 when there is nothing to divide). */
export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

// ---------------------------------------------------------------------------------------------
// Session comparison, each student's progress, and who needs attention.
//
// Every comparison is the same one: each student's last two results within the chosen
// sessions. With sessions 1 and 2 chosen, that is exactly session 1 against session 2.

/** A level's place on the scale: beginning 0 … school ready 3. */
export function levelRank(level: Level): number {
  return LEVELS.indexOf(level);
}

export type Change = 'up' | 'same' | 'down';

export function levelChange(from: Level, to: Level): Change {
  const difference = levelRank(to) - levelRank(from);
  return difference > 0 ? 'up' : difference < 0 ? 'down' : 'same';
}

/** Where a student stands in one session: a level, a stored value that isn't one, or nothing. */
export type Standing = Level | 'other' | 'none';

export const STANDINGS: readonly Standing[] = [...LEVELS, 'other', 'none'];

export function standingOf(result: SessionResult | null | undefined): Standing {
  if (!result) return 'none';
  return result.level ?? 'other';
}

/** Counts per standing (levels, other, not assessed). */
export type StandingCounts = Record<Standing, number>;

function emptyStandings<T>(make: () => T): Record<Standing, T> {
  return Object.fromEntries(STANDINGS.map((s) => [s, make()])) as Record<Standing, T>;
}

/** One bar: how the students did in one session. Every student is counted once. */
export interface SessionBar {
  session: SessionNumber;
  counts: StandingCounts;
  total: number;
  /** Names per standing, sorted. */
  names: Record<Standing, string[]>;
}

/** Whether anyone has a result in the bar (rather than everyone "not assessed"). */
export function hasResults(bar: Pick<SessionBar, 'counts' | 'total'>): boolean {
  return bar.counts.none < bar.total;
}

export function sessionBar(progress: ChildProgress[], session: SessionNumber): SessionBar {
  const counts = emptyStandings(() => 0);
  const names = emptyStandings<string[]>(() => []);
  for (const p of progress) {
    const standing = standingOf(p.sessions.find((s) => s.session === session));
    counts[standing]++;
    names[standing].push(p.child.name);
  }
  for (const standing of STANDINGS) names[standing].sort((a, b) => a.localeCompare(b));
  return { session, counts, total: progress.length, names };
}

export interface ChangeCounts {
  up: number;
  same: number;
  down: number;
}

export function addChanges(a: ChangeCounts, b: ChangeCounts): ChangeCounts {
  return { up: a.up + b.up, same: a.same + b.same, down: a.down + b.down };
}

/** A student's change: between their last two results that have a level. */
export interface StudentChange {
  change: Change;
  from: SessionResult;
  to: SessionResult;
}

export function latestChange(results: readonly SessionResult[]): StudentChange | null {
  const levelled = results.filter((r) => r.level !== null);
  if (levelled.length < 2) return null;
  const from = levelled[levelled.length - 2];
  const to = levelled[levelled.length - 1];
  return { change: levelChange(from.level as Level, to.level as Level), from, to };
}

/** A student's results in the chosen sessions only, in session order. */
function inSessions(
  results: readonly SessionResult[],
  sessions: readonly SessionNumber[],
): SessionResult[] {
  return results.filter((r) => sessions.includes(r.session));
}

/** How many students went up, stayed or went down since their session before. */
export function changesOf(
  progress: readonly ChildProgress[],
  sessions: readonly SessionNumber[],
): ChangeCounts {
  const counts: ChangeCounts = { up: 0, same: 0, down: 0 };
  for (const p of progress) {
    const change = latestChange(inSessions(p.sessions, sessions));
    if (change) counts[change.change]++;
  }
  return counts;
}

/** What the filters above the dashboard choose. Empty `competencyIds`: all of the domain. */
export interface DashboardFilter {
  domainId: number | null;
  competencyIds: readonly number[];
  sessions: readonly SessionNumber[];
}

/** One competency: a bar per chosen session, and how the students changed. */
export interface CompetencyView {
  competency: Competency;
  domain: Domain;
  /** One per chosen session, in order. */
  bars: SessionBar[];
  /** The bars of sessions in which someone has been assessed. */
  started: SessionBar[];
  /** Chosen sessions in which nobody has been assessed yet. */
  notStarted: SessionNumber[];
  /** Null when fewer than two sessions are chosen. */
  change: ChangeCounts | null;
  progress: ChildProgress[];
}

function chosenCompetencies(data: DashboardData, filter: DashboardFilter) {
  return data.domains
    .filter((domain) => filter.domainId === null || domain.id === filter.domainId)
    .flatMap((domain) =>
      domain.competencies
        .filter((c) => !filter.competencyIds.length || filter.competencyIds.includes(c.id))
        .map((competency) => ({ competency, domain })),
    );
}

function sorted(sessions: readonly SessionNumber[]): SessionNumber[] {
  return [...sessions].sort((a, b) => a - b);
}

export function competencyViews(data: DashboardData, filter: DashboardFilter): CompetencyView[] {
  const sessions = sorted(filter.sessions);
  return chosenCompetencies(data, filter).map(({ competency, domain }) => {
    const progress = matchProgress(data.children, data.records.get(competency.id) ?? []);
    const bars = sessions.map((session) => sessionBar(progress, session));
    return {
      competency,
      domain,
      bars,
      started: bars.filter(hasResults),
      notStarted: bars.filter((bar) => !hasResults(bar)).map((bar) => bar.session),
      change: sessions.length > 1 ? changesOf(progress, sessions) : null,
      progress,
    };
  });
}

/**
 * Several competencies together (a domain, or everything): a bar per chosen session that has
 * results. Counts are results (a student in a competency), not students.
 */
export interface CombinedSummary {
  competencies: number;
  bars: Omit<SessionBar, 'names'>[];
  change: ChangeCounts | null;
}

export function combine(views: readonly CompetencyView[]): CombinedSummary {
  const sessions = views[0]?.bars.map((bar) => bar.session) ?? [];
  const bars = sessions.map((session, i) => {
    const counts = emptyStandings(() => 0);
    let total = 0;
    for (const view of views) {
      const bar = view.bars[i];
      for (const standing of STANDINGS) counts[standing] += bar.counts[standing];
      total += bar.total;
    }
    return { session, counts, total };
  });
  const change =
    sessions.length > 1
      ? views.reduce<ChangeCounts>((sum, v) => (v.change ? addChanges(sum, v.change) : sum), {
          up: 0,
          same: 0,
          down: 0,
        })
      : null;
  return { competencies: views.length, bars: bars.filter(hasResults), change };
}

export interface DomainSummary extends CombinedSummary {
  domain: Domain;
}

export function domainSummaries(views: readonly CompetencyView[]): DomainSummary[] {
  const byDomain = new Map<number, CompetencyView[]>();
  for (const view of views) {
    byDomain.set(view.domain.id, [...(byDomain.get(view.domain.id) ?? []), view]);
  }
  return [...byDomain.values()].map((list) => ({ domain: list[0].domain, ...combine(list) }));
}

/** One student in one competency, within the chosen sessions. */
export interface StudentCompetency {
  competency: Competency;
  domain: Domain;
  /** Index 0 is session 1; sessions that weren't chosen are null. */
  sessions: (SessionResult | null)[];
  latest: SessionResult | null;
  change: StudentChange | null;
  /**
   * The latest chosen session in which other students were assessed in this competency, when
   * this student wasn't; null otherwise.
   */
  missed: SessionNumber | null;
}

export interface StudentView {
  child: Child;
  items: StudentCompetency[];
  /** Average of the latest levels, rounded; null when nothing is assessed yet. */
  overall: Level | null;
  assessed: number;
  changes: ChangeCounts;
}

export function studentViews(data: DashboardData, filter: DashboardFilter): StudentView[] {
  const sessions = sorted(filter.sessions);
  const chosen = chosenCompetencies(data, filter).map(({ competency, domain }) => {
    const progress = matchProgress(data.children, data.records.get(competency.id) ?? []);
    const reached = Math.max(
      0,
      ...progress.flatMap((p) => inSessions(p.sessions, sessions).map((s) => s.session)),
    );
    return {
      competency,
      domain,
      byChild: new Map(progress.map((p) => [p.child.id, inSessions(p.sessions, sessions)])),
      reached: reached ? (reached as SessionNumber) : null,
    };
  });
  return [...data.children]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((child) => {
      const items = chosen.map(({ competency, domain, byChild, reached }): StudentCompetency => {
        const results = byChild.get(child.id) ?? [];
        return {
          competency,
          domain,
          sessions: SESSION_NUMBERS.map((n) => results.find((r) => r.session === n) ?? null),
          latest: results[results.length - 1] ?? null,
          change: latestChange(results),
          missed: reached && !results.some((r) => r.session === reached) ? reached : null,
        };
      });
      const levels = items
        .map((item) => item.latest?.level)
        .filter((level): level is Level => !!level);
      const changes: ChangeCounts = { up: 0, same: 0, down: 0 };
      for (const item of items) if (item.change) changes[item.change.change]++;
      return {
        child,
        items,
        overall: levels.length
          ? LEVELS[Math.round(levels.reduce((sum, l) => sum + levelRank(l), 0) / levels.length)]
          : null,
        assessed: items.filter((item) => item.latest).length,
        changes,
      };
    });
}

/**
 * Why a student needs attention in a competency: their level went down since their session
 * before, stayed the same without reaching School Ready, or they missed the latest session
 * the others were assessed in. Students already School Ready need none.
 */
export type AttentionReason = 'down' | 'same' | 'none';

export interface AttentionItem {
  item: StudentCompetency;
  reason: AttentionReason;
}

export interface StudentAttention {
  student: StudentView;
  items: AttentionItem[];
  counts: Record<AttentionReason, number>;
}

const REASON_ORDER: readonly AttentionReason[] = ['down', 'same', 'none'];

export function attentionReason(item: StudentCompetency): AttentionReason | null {
  if (item.latest?.level === 'schoolReady') return null;
  if (item.change?.change === 'down') return 'down';
  if (item.change?.change === 'same') return 'same';
  if (item.missed) return 'none';
  return null;
}

/** Students who need support, most urgent first (went down, then no progress, then missed). */
export function needsAttention(students: readonly StudentView[]): StudentAttention[] {
  return students
    .map((student) => {
      const items = student.items
        .map((item) => ({ item, reason: attentionReason(item) }))
        .filter((entry): entry is AttentionItem => entry.reason !== null)
        .sort((a, b) => REASON_ORDER.indexOf(a.reason) - REASON_ORDER.indexOf(b.reason));
      const counts = { down: 0, same: 0, none: 0 };
      for (const entry of items) counts[entry.reason]++;
      return { student, items, counts };
    })
    .filter((entry) => entry.items.length > 0)
    .sort(
      (a, b) =>
        b.counts.down - a.counts.down ||
        b.counts.same - a.counts.same ||
        b.counts.none - a.counts.none ||
        a.student.child.name.localeCompare(b.student.child.name),
    );
}

/** Sessions with at least one result, for the session filter's default. */
export function sessionsWithResults(data: DashboardData): SessionNumber[] {
  const found = new Set<SessionNumber>();
  for (const records of data.records.values()) {
    for (const record of records) for (const s of record.sessions) found.add(s.session);
  }
  return SESSION_NUMBERS.filter((n) => found.has(n));
}
