import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { TEST_API, setupHttpTesting } from '../../../testing/http';
import type { ApiAssessmentRow, AssessmentSubmission } from '../models/assessment';
import { AssessmentApi, toAssessmentRecord, toSessionResult } from './assessment-api';

const row: ApiAssessmentRow = {
  name: 'Aarav Kumar',
  gender: 'Boy',
  child_id: 1,
  session_1: {
    observation: 'Advancing',
    created_at: '2026-07-10T10:00:00.000000Z',
    remarks: 'Enjoyed sorting',
    age: '5y 3m',
    height: '101',
    weight: '15.5',
  },
  session_2: '-',
  session_3: { observation: null, created_at: null },
  session_4: 'School Ready',
};

describe('AssessmentApi', () => {
  let http: HttpTestingController;
  let api: AssessmentApi;

  beforeEach(() => {
    http = setupHttpTesting();
    api = TestBed.inject(AssessmentApi);
  });

  afterEach(() => http.verify());

  it('loads with GET /assessments/anganwadi/{aid}/competency/{cid}', async () => {
    const result = firstValueFrom(api.forCompetency(1, 7));
    const req = http.expectOne(`${TEST_API}/assessments/anganwadi/1/competency/7`);
    expect(req.request.method).toBe('GET');
    req.flush([row]);
    expect((await result)[0].childId).toBe(1);
  });

  it('submits with POST /assessments/ (trailing slash) and the body unchanged', () => {
    const submission: AssessmentSubmission = {
      children: [1],
      competency_id: 7,
      observation: 'Advancing',
      assessment_date: '2026-10-06',
      remarks: '',
      anganwadi_id: 1,
      attempt_number: 2,
      age: '5y 6m',
      height: '',
      weight: '',
    };
    api.submit(submission).subscribe();
    const req = http.expectOne(`${TEST_API}/assessments/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(submission);
    req.flush({ success: true });
  });
});

describe('assessment mapping', () => {
  it('reads completed sessions and skips empty ones', () => {
    const record = toAssessmentRecord(row);
    expect(record.sessions.map((s) => s.session)).toEqual([1, 4]);
    const first = record.sessions[0];
    expect(first.level).toBe('advancing');
    expect(first.date).toBe('2026-07-10');
    expect(first.heightCm).toBe(101);
    expect(first.weightKg).toBe(15.5);
    expect(first.age).toBe('5y 3m');
    expect(record.sessions[1].level).toBe('schoolReady');
    expect(record.sessions[1].date).toBeNull();
  });

  it('treats rows without child_id as unmatched', () => {
    expect(toAssessmentRecord({ ...row, child_id: undefined }).childId).toBeNull();
  });

  it('ignores session objects missing an observation or timestamp', () => {
    expect(toSessionResult({ observation: 'Beginning', created_at: null }, 1)).toBeNull();
    expect(toSessionResult({ observation: null, created_at: '2026-01-01' }, 1)).toBeNull();
    expect(toSessionResult(42, 1)).toBeNull();
  });

  it('keeps sessions whose observation is not a known level', () => {
    const result = toSessionResult({ observation: 'Unknown', created_at: '2026-01-01' }, 2);
    expect(result?.level).toBeNull();
    expect(result?.rawObservation).toBe('Unknown');
  });
});
