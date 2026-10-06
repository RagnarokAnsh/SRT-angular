import type { IsoDate } from '../util/dates';
import type { Level } from './level';

export const SESSION_NUMBERS = [1, 2, 3, 4] as const;
export type SessionNumber = (typeof SESSION_NUMBERS)[number];

/** One session inside an assessment row from the API. */
export interface ApiSessionData {
  observation: string | null;
  created_at: string | null;
  remarks?: string | null;
  age?: string | null;
  height?: string | number | null;
  weight?: string | number | null;
}

/**
 * A row from GET /assessments/anganwadi/{id}/competency/{id}. Empty sessions come back
 * as "-"; very old rows may hold just the level as a string.
 */
export interface ApiAssessmentRow {
  name: string;
  gender?: string;
  child_id?: number | null;
  session_1: ApiSessionData | string | null;
  session_2: ApiSessionData | string | null;
  session_3: ApiSessionData | string | null;
  session_4: ApiSessionData | string | null;
  remarks?: string | null;
}

/** Body for POST /assessments/ (one child per request, as before). */
export interface AssessmentSubmission {
  children: number[];
  competency_id: number;
  observation: string;
  assessment_date: IsoDate;
  remarks: string;
  anganwadi_id: number;
  attempt_number: number;
  age: string;
  height: string;
  weight: string;
}

export interface SessionResult {
  session: SessionNumber;
  /** Null when the stored observation is not a recognised level. */
  level: Level | null;
  rawObservation: string;
  date: IsoDate | null;
  remarks: string;
  /** As stored, e.g. "5y 2m". */
  age: string | null;
  heightCm: number | null;
  weightKg: number | null;
}

export interface ChildAssessmentRecord {
  childId: number | null;
  name: string;
  sessions: SessionResult[];
  remarks: string;
}
