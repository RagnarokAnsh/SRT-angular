import { type Observable, catchError, from, map, mergeMap, of, toArray } from 'rxjs';

import type { ChildProgress } from '@core/assessment/progress';
import type { AssessmentSubmission } from '@core/models/assessment';
import { LEVEL_API_VALUE, type Level } from '@core/models/level';
import { type AppError, toAppError } from '@core/network/app-error';
import { type IsoDate, ageOn, formatAgeCompact } from '@core/util/dates';

export { type ChildProgress, MAX_SESSIONS, matchProgress } from '@core/assessment/progress';

export interface SubmissionInput {
  progress: ChildProgress;
  heightCm?: number | null;
  weightKg?: number | null;
}

/** One request per child, exactly as the previous version sent them. */
export function buildSubmissions(options: {
  children: SubmissionInput[];
  competencyId: number;
  level: Level;
  remarks: string;
  anganwadiId: number;
  today: IsoDate;
}): AssessmentSubmission[] {
  return options.children
    .filter(({ progress }) => progress.nextSession !== null)
    .map(({ progress, heightCm, weightKg }) => {
      const dob = progress.child.dateOfBirth;
      const age = dob ? ageOn(dob, options.today) : null;
      return {
        children: [progress.child.id],
        competency_id: options.competencyId,
        observation: LEVEL_API_VALUE[options.level],
        assessment_date: options.today,
        remarks: options.remarks.trim(),
        anganwadi_id: options.anganwadiId,
        attempt_number: progress.nextSession as number,
        age: age ? formatAgeCompact(age) : '',
        height: heightCm === null || heightCm === undefined ? '' : String(heightCm),
        weight: weightKg === null || weightKg === undefined ? '' : String(weightKg),
      };
    });
}

export interface SubmissionResult {
  childId: number;
  error: AppError | null;
}

/**
 * Sends the submissions a few at a time and reports each child's outcome, so one failure
 * doesn't hide which children were saved.
 */
export function submitEach(
  submissions: AssessmentSubmission[],
  send: (submission: AssessmentSubmission) => Observable<unknown>,
  concurrency = 3,
): Observable<SubmissionResult[]> {
  if (!submissions.length) return of([]);
  return from(submissions).pipe(
    mergeMap(
      (submission) =>
        send(submission).pipe(
          map((): SubmissionResult => ({ childId: submission.children[0], error: null })),
          catchError((error: unknown) =>
            of<SubmissionResult>({ childId: submission.children[0], error: toAppError(error) }),
          ),
        ),
      concurrency,
    ),
    toArray(),
  );
}
