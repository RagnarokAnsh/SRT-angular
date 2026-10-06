import type { ChildAssessmentRecord, SessionNumber, SessionResult } from '../models/assessment';
import type { Child } from '../models/child';

export const MAX_SESSIONS = 4;

/** A child with their sessions so far for one competency. */
export interface ChildProgress {
  child: Child;
  /** Completed sessions, in session order. */
  sessions: SessionResult[];
  /** The session to record next, or null once all four are done. */
  nextSession: SessionNumber | null;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function sortedSessions(record: ChildAssessmentRecord | undefined): SessionResult[] {
  if (!record) return [];
  const bySession = new Map<number, SessionResult>();
  for (const session of record.sessions) bySession.set(session.session, session);
  return [...bySession.values()].sort((a, b) => a.session - b.session);
}

/**
 * Matches assessment rows to children by `child_id`. Rows without an id (older backend
 * versions) only match a child with exactly the same name, and only when that name is
 * unique on both sides, so "Ram" can never pick up "Ramesh"'s results.
 */
export function matchProgress(
  children: Child[],
  records: ChildAssessmentRecord[],
): ChildProgress[] {
  const byId = new Map<number, ChildAssessmentRecord>();
  const unmatchedByName = new Map<string, ChildAssessmentRecord[]>();
  for (const record of records) {
    if (record.childId !== null) {
      byId.set(record.childId, record);
    } else if (record.name) {
      const key = normalizeName(record.name);
      unmatchedByName.set(key, [...(unmatchedByName.get(key) ?? []), record]);
    }
  }
  const childNameCounts = new Map<string, number>();
  for (const child of children) {
    const key = normalizeName(child.name);
    childNameCounts.set(key, (childNameCounts.get(key) ?? 0) + 1);
  }

  return children.map((child) => {
    let record = byId.get(child.id);
    if (!record) {
      const key = normalizeName(child.name);
      const candidates = unmatchedByName.get(key) ?? [];
      if (candidates.length === 1 && childNameCounts.get(key) === 1) record = candidates[0];
    }
    const sessions = sortedSessions(record);
    const last = sessions.length ? sessions[sessions.length - 1].session : 0;
    const next = last + 1;
    return {
      child,
      sessions,
      nextSession: next <= MAX_SESSIONS ? (next as SessionNumber) : null,
    };
  });
}
