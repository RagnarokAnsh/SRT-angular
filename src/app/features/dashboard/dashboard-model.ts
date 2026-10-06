import { type ChildProgress, MAX_SESSIONS, matchProgress } from '@core/assessment/progress';
import type { ChildAssessmentRecord, SessionNumber, SessionResult } from '@core/models/assessment';
import type { Child } from '@core/models/child';
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
  const gender = (value: string) => value.trim().toLowerCase();
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
    boys: children.filter((c) => ['boy', 'male'].includes(gender(c.gender))).length,
    girls: children.filter((c) => ['girl', 'female'].includes(gender(c.gender))).length,
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
