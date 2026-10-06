import type { ChildAssessmentRecord, SessionResult } from '@core/models/assessment';
import type { Child } from '@core/models/child';
import type { Competency, Domain } from '@core/models/competency';
import type { Level } from '@core/models/level';

import { buildRows, competencyRow, percent, summarize } from './dashboard-model';

const child = (id: number, gender = 'Boy'): Child => ({
  id,
  name: `Child ${id}`,
  dateOfBirth: '2021-01-01',
  symbol: '',
  heightCm: null,
  weightKg: null,
  language: '',
  anganwadiId: 1,
  centerName: null,
  gender,
  awwId: null,
});

const session = (n: 1 | 2 | 3 | 4, level: Level | null, raw = 'x'): SessionResult => ({
  session: n,
  level,
  rawObservation: raw,
  date: '2026-07-01',
  remarks: '',
  age: null,
  heightCm: null,
  weightKg: null,
});

const competency = (id: number, domainId: number): Competency => ({
  id,
  name: `C${id}`,
  description: '',
  domainId,
  domainName: `D${domainId}`,
  slug: `c${id}`,
});

const domainA: Domain = { id: 1, name: 'A', slug: 'a', competencies: [competency(1, 1), competency(2, 1)] };
const domainB: Domain = { id: 2, name: 'B', slug: 'b', competencies: [competency(3, 2)] };

const record = (childId: number, sessions: SessionResult[]): ChildAssessmentRecord => ({
  childId,
  name: `Child ${childId}`,
  sessions,
  remarks: '',
});

describe('dashboard model', () => {
  const children = [child(1), child(2, 'Girl'), child(3, 'Girl')];
  const records = [
    record(1, [session(1, 'beginning'), session(2, 'advancing')]),
    record(2, [session(1, 'progressing')]),
  ];

  it('counts each child once, by their latest result', () => {
    const row = competencyRow(domainA.competencies[0], domainA, children, records, 'latest');
    expect(row.counts).toEqual({ beginning: 0, progressing: 1, advancing: 1, schoolReady: 0 });
    expect(row.notAssessed).toBe(1);
    expect(row.total).toBe(3);
  });

  it('can count one session instead', () => {
    const row = competencyRow(domainA.competencies[0], domainA, children, records, 1);
    expect(row.counts).toEqual({ beginning: 1, progressing: 1, advancing: 0, schoolReady: 0 });
    const second = competencyRow(domainA.competencies[0], domainA, children, records, 2);
    expect(second.counts.advancing).toBe(1);
    expect(second.notAssessed).toBe(2);
  });

  it('keeps unrecognised stored values visible as "other"', () => {
    const row = competencyRow(domainA.competencies[0], domainA, [child(1)], [record(1, [session(1, null, 'Excellent')])], 'latest');
    expect(row.other).toBe(1);
    expect(row.notAssessed).toBe(0);
  });

  it('builds rows for every competency, optionally for one domain', () => {
    const data = { domains: [domainA, domainB], children, records: new Map([[1, records]]) };
    expect(buildRows(data, 'latest', null).map((r) => r.competency.id)).toEqual([1, 2, 3]);
    expect(buildRows(data, 'latest', 2).map((r) => r.competency.id)).toEqual([3]);
  });

  it('summarises children, sessions done and levels', () => {
    const data = { domains: [domainA, domainB], children, records: new Map([[1, records]]) };
    const summary = summarize(children, buildRows(data, 'latest', null));
    expect(summary).toMatchObject({ children: 3, boys: 1, girls: 2, sessionsDone: 3, sessionsPossible: 36, results: 2 });
    expect(summary.counts.advancing).toBe(1);
  });

  it('rounds percentages and never divides by zero', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
  });
});
