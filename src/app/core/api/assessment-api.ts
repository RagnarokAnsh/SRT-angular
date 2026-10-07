import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  type ApiAssessmentRow,
  type ApiSessionData,
  type AssessmentSubmission,
  type ChildAssessmentRecord,
  SESSION_NUMBERS,
  type SessionNumber,
  type SessionResult,
} from '../models/assessment';
import { parseLevel } from '../models/level';
import { timestampToIsoDate } from '../util/dates';
import { API_BASE_URL } from './api-base-url';
import { expectSuccess, text, toId, toMeasure, unwrapList } from './parse';

/**
 * Reads one session slot. Empty slots are "-" (or missing). An object only counts as a
 * completed session when it has both an observation and a timestamp, as before.
 */
export function toSessionResult(raw: unknown, session: SessionNumber): SessionResult | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'string') {
    const value = raw.trim();
    if (value === '' || value === '-') return null;
    return {
      session,
      level: parseLevel(value),
      rawObservation: value,
      date: null,
      remarks: '',
      age: null,
      heightCm: null,
      weightKg: null,
    };
  }
  if (typeof raw !== 'object') return null;
  const data = raw as Partial<Record<keyof ApiSessionData, unknown>>;
  if (data.observation === null || data.observation === undefined) return null;
  if (data.created_at === null || data.created_at === undefined) return null;
  return {
    session,
    level: parseLevel(data.observation),
    rawObservation: text(data.observation),
    date: timestampToIsoDate(data.created_at),
    remarks: text(data.remarks),
    age: text(data.age) || null,
    heightCm: toMeasure(data.height),
    weightKg: toMeasure(data.weight),
  };
}

export function toAssessmentRecord(value: unknown): ChildAssessmentRecord {
  const row = (value && typeof value === 'object' ? value : {}) as Partial<
    Record<keyof ApiAssessmentRow, unknown>
  >;
  const sessions: SessionResult[] = [];
  for (const n of SESSION_NUMBERS) {
    const result = toSessionResult(row[`session_${n}`], n);
    if (result) sessions.push(result);
  }
  return {
    childId: toId(row.child_id),
    name: text(row.name),
    sessions,
    remarks: text(row.remarks),
  };
}

@Injectable({ providedIn: 'root' })
export class AssessmentApi {
  private readonly http = inject(HttpClient);
  private readonly base = inject(API_BASE_URL);

  /** GET /assessments/anganwadi/{anganwadiId}/competency/{competencyId} */
  forCompetency(anganwadiId: number, competencyId: number): Observable<ChildAssessmentRecord[]> {
    return this.http
      .get<unknown>(`${this.base}/assessments/anganwadi/${anganwadiId}/competency/${competencyId}`)
      .pipe(map((body) => unwrapList<unknown>(body).map(toAssessmentRecord)));
  }

  /** POST /assessments/ (with the trailing slash the backend route uses). */
  submit(submission: AssessmentSubmission): Observable<void> {
    return this.http
      .post<unknown>(`${this.base}/assessments/`, submission)
      .pipe(map(expectSuccess));
  }
}
