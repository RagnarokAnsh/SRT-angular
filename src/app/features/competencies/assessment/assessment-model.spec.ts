import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, of, throwError } from 'rxjs';

import type { ChildAssessmentRecord, SessionResult } from '@core/models/assessment';
import type { Child } from '@core/models/child';

import { buildSubmissions, matchProgress, submitEach } from './assessment-model';

function child(id: number, name: string, dateOfBirth: string | null = '2021-03-14'): Child {
  return {
    id,
    name,
    dateOfBirth,
    symbol: '',
    heightCm: null,
    weightKg: null,
    language: '',
    anganwadiId: 1,
    centerName: null,
    gender: 'Boy',
    awwId: null,
  };
}

function session(n: 1 | 2 | 3 | 4, level: SessionResult['level'] = 'progressing'): SessionResult {
  return {
    session: n,
    level,
    rawObservation: 'Progressing',
    date: '2026-07-14',
    remarks: '',
    age: null,
    heightCm: null,
    weightKg: null,
  };
}

function record(childId: number | null, name: string, sessions: SessionResult[]): ChildAssessmentRecord {
  return { childId, name, sessions, remarks: '' };
}

describe('matchProgress', () => {
  it('matches rows by child id and finds the next session', () => {
    const [ramesh, ram] = matchProgress(
      [child(5, 'Ramesh Kumar'), child(6, 'Ram Singh')],
      [record(6, 'Ram Singh', [session(1), session(2)]), record(5, 'Ramesh Kumar', [session(1)])],
    );
    expect(ramesh.sessions.map((s) => s.session)).toEqual([1]);
    expect(ramesh.nextSession).toBe(2);
    expect(ram.nextSession).toBe(3);
  });

  it('never gives one child another child’s results because of similar names', () => {
    // The old code matched "Ram" against "Ramesh Kumar" with includes().
    const [ram] = matchProgress([child(6, 'Ram')], [record(null, 'Ramesh Kumar', [session(1)])]);
    expect(ram.sessions).toEqual([]);
    expect(ram.nextSession).toBe(1);
  });

  it('falls back to an exact, unique name when a row has no child id', () => {
    const [aarav] = matchProgress([child(1, 'Aarav  Kumar')], [record(null, 'aarav kumar', [session(1)])]);
    expect(aarav.nextSession).toBe(2);
    const twins = matchProgress(
      [child(1, 'Aarav'), child(2, 'Aarav')],
      [record(null, 'Aarav', [session(1)])],
    );
    expect(twins.every((p) => p.sessions.length === 0)).toBe(true);
  });

  it('stops after four sessions', () => {
    const [done] = matchProgress(
      [child(3, 'Kabir')],
      [record(3, 'Kabir', [session(4), session(1), session(3), session(2)])],
    );
    expect(done.sessions.map((s) => s.session)).toEqual([1, 2, 3, 4]);
    expect(done.nextSession).toBeNull();
  });
});

describe('buildSubmissions', () => {
  it('builds one request per child in the existing format', () => {
    const [progress] = matchProgress([child(5, 'Ramesh', '2021-01-09')], [record(5, 'Ramesh', [session(1)])]);
    expect(
      buildSubmissions({
        children: [{ progress, heightCm: 101.5, weightKg: 15 }],
        competencyId: 10,
        level: 'schoolReady',
        remarks: '  Good balance ',
        anganwadiId: 1,
        today: '2026-10-06',
      }),
    ).toEqual([
      {
        children: [5],
        competency_id: 10,
        observation: 'School Ready',
        assessment_date: '2026-10-06',
        remarks: 'Good balance',
        anganwadi_id: 1,
        attempt_number: 2,
        age: '5y 8m',
        height: '101.5',
        weight: '15',
      },
    ]);
  });

  it('leaves out children who have finished all sessions, and blank measurements', () => {
    const progress = matchProgress(
      [child(1, 'A', null), child(2, 'B')],
      [record(2, 'B', [session(1), session(2), session(3), session(4)])],
    );
    const result = buildSubmissions({
      children: progress.map((p) => ({ progress: p })),
      competencyId: 1,
      level: 'beginning',
      remarks: '',
      anganwadiId: 1,
      today: '2026-10-06',
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ children: [1], age: '', height: '', weight: '', attempt_number: 1 });
  });
});

describe('submitEach', () => {
  it('reports success and failure for each child', async () => {
    const [a, b] = matchProgress([child(1, 'A'), child(2, 'B')], []);
    const submissions = buildSubmissions({
      children: [{ progress: a }, { progress: b }],
      competencyId: 1,
      level: 'advancing',
      remarks: '',
      anganwadiId: 1,
      today: '2026-10-06',
    });
    const results = await firstValueFrom(
      submitEach(submissions, (s) =>
        s.children[0] === 2 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of({}),
      ),
    );
    expect(results.find((r) => r.childId === 1)?.error).toBeNull();
    expect(results.find((r) => r.childId === 2)?.error?.kind).toBe('server');
  });
});
