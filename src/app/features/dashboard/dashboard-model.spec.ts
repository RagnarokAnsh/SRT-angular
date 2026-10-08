import type { ChildAssessmentRecord, SessionResult } from '@core/models/assessment';
import type { Child } from '@core/models/child';
import type { Competency, Domain } from '@core/models/competency';
import type { Level } from '@core/models/level';

import {
  buildRows,
  changesOf,
  combine,
  competencyRow,
  competencyViews,
  domainSummaries,
  needsAttention,
  percent,
  sessionBar,
  sessionsWithResults,
  studentViews,
  summarize,
} from './dashboard-model';
import { matchProgress } from '@core/assessment/progress';

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

const domainA: Domain = {
  id: 1,
  name: 'A',
  slug: 'a',
  competencies: [competency(1, 1), competency(2, 1)],
};
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
    const row = competencyRow(
      domainA.competencies[0],
      domainA,
      [child(1)],
      [record(1, [session(1, null, 'Excellent')])],
      'latest',
    );
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
    expect(summary).toMatchObject({
      children: 3,
      boys: 1,
      girls: 2,
      sessionsDone: 3,
      sessionsPossible: 36,
      results: 2,
    });
    expect(summary.counts.advancing).toBe(1);
  });

  it('rounds percentages and never divides by zero', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(5, 0)).toBe(0);
  });
});

describe('session comparison', () => {
  const filterAll = { domainId: null, competencyIds: [] };
  const children = [child(1), child(2, 'Girl'), child(3, 'Girl'), child(4)];
  const records = [
    record(1, [session(1, 'beginning'), session(2, 'advancing')]),
    record(2, [session(1, 'progressing'), session(2, 'progressing')]),
    record(3, [session(1, 'schoolReady'), session(2, 'advancing')]),
  ];
  const data = {
    domains: [domainA, domainB],
    children,
    records: new Map([
      [1, records],
      [3, [record(1, [session(1, 'beginning')])]],
    ]),
  };

  it('counts every student once per session, with the names at each level', () => {
    const bar = sessionBar(matchProgress(children, records), 2);
    expect(bar.counts).toMatchObject({ advancing: 2, progressing: 1, none: 1, beginning: 0 });
    expect(bar.total).toBe(4);
    expect(bar.names.advancing).toEqual(['Child 1', 'Child 3']);
    expect(bar.names.none).toEqual(['Child 4']);
  });

  it("compares each student's last two chosen sessions", () => {
    const progress = matchProgress(children, records);
    expect(changesOf(progress, [1, 2])).toEqual({ up: 1, same: 1, down: 1 });
    // One session chosen: nothing to compare.
    expect(changesOf(progress, [2])).toEqual({ up: 0, same: 0, down: 0 });

    // With three sessions, the latest change counts (2 → 3), and a student who missed
    // session 3 is compared on the two sessions they have.
    const later = matchProgress(children, [
      record(1, [session(1, 'beginning'), session(2, 'advancing'), session(3, 'progressing')]),
      record(2, [session(1, 'beginning'), session(2, 'progressing')]),
    ]);
    expect(changesOf(later, [1, 2, 3])).toEqual({ up: 1, same: 0, down: 1 });
    expect(changesOf(later, [1, 3])).toEqual({ up: 1, same: 0, down: 0 });
  });

  it('builds a view per chosen competency, with a bar per chosen session', () => {
    const views = competencyViews(data, { domainId: null, competencyIds: [], sessions: [2, 1] });
    expect(views.map((v) => v.competency.id)).toEqual([1, 2, 3]);
    expect(views[0].bars.map((b) => b.session)).toEqual([1, 2]);
    expect(views[0].change).toEqual({ up: 1, same: 1, down: 1 });
    // Nobody assessed in competency 2; in competency 3, only in session 1.
    expect(views[1].started).toEqual([]);
    expect(views[1].notStarted).toEqual([1, 2]);
    expect(views[2].started.map((b) => b.session)).toEqual([1]);
    expect(views[2].notStarted).toEqual([2]);
    const one = competencyViews(data, { domainId: 1, competencyIds: [2], sessions: [1] });
    expect(one.map((v) => v.competency.id)).toEqual([2]);
    expect(one[0].change).toBeNull();
  });

  it('adds up the competencies of a domain as results, leaving out sessions without any', () => {
    const views = competencyViews(data, { domainId: null, competencyIds: [], sessions: [1, 2] });
    const [a, b] = domainSummaries(views);
    expect(a.domain.id).toBe(1);
    expect(a.competencies).toBe(2);
    expect(a.bars.map((bar) => bar.session)).toEqual([1, 2]);
    expect(a.bars[0].total).toBe(8);
    expect(a.bars[0].counts.none).toBe(5);
    expect(a.change).toEqual({ up: 1, same: 1, down: 1 });
    expect(b.bars.map((bar) => bar.session)).toEqual([1]);
    expect(b.bars[0].counts.beginning).toBe(1);

    const all = combine(views);
    expect(all.competencies).toBe(3);
    expect(all.bars[0].total).toBe(12);
    expect(all.change).toEqual({ up: 1, same: 1, down: 1 });
    expect(combine(competencyViews(data, { ...filterAll, sessions: [1] })).change).toBeNull();
  });

  it('lists the sessions that have any result', () => {
    expect(sessionsWithResults(data)).toEqual([1, 2]);
  });
});

describe('students and who needs attention', () => {
  const children = [child(1), child(2), child(3), child(4)];
  const data = {
    domains: [domainA],
    children,
    records: new Map([
      [
        1,
        [
          record(1, [session(1, 'advancing'), session(2, 'progressing')]),
          record(2, [session(1, 'beginning'), session(2, 'beginning')]),
          record(3, [session(1, 'schoolReady'), session(2, 'schoolReady')]),
          record(4, [session(1, 'beginning'), session(2, 'progressing')]),
        ],
      ],
      [2, [record(1, [session(1, 'progressing')]), record(3, [session(1, 'schoolReady')])]],
    ]),
  };
  const filter = { domainId: null, competencyIds: [], sessions: [1, 2] as const };
  const students = studentViews(data, { ...filter, sessions: [1, 2] });

  it("shows each student's results per session, the latest change and an overall level", () => {
    const first = students[0];
    expect(first.child.id).toBe(1);
    expect(first.items[0].sessions.map((s) => s?.level ?? null)).toEqual([
      'advancing',
      'progressing',
      null,
      null,
    ]);
    expect(first.items[0].change?.change).toBe('down');
    // Latest levels: progressing (C1) and progressing (C2).
    expect(first.overall).toBe('progressing');
    expect(first.assessed).toBe(2);
    expect(students[3].changes).toEqual({ up: 1, same: 0, down: 0 });
  });

  it('flags a level that went down, stayed the same below School Ready, or was missed', () => {
    const attention = needsAttention(students);
    const reasons = Object.fromEntries(
      attention.map((a) => [a.student.child.id, a.items.map((i) => i.reason)]),
    );
    expect(reasons[1]).toEqual(['down']);
    expect(reasons[2]).toEqual(['same', 'none']);
    // Staying at School Ready is fine.
    expect(reasons[3]).toBeUndefined();
    // Went up in C1, but wasn't assessed in C2 when the others were (session 1).
    expect(reasons[4]).toEqual(['none']);
    expect(students[3].items[1].missed).toBe(1);
    expect(students[0].items[1].missed).toBeNull();
    // Most urgent first.
    expect(attention.map((a) => a.student.child.id)).toEqual([1, 2, 4]);
  });

  it('only looks at the chosen sessions', () => {
    const first = needsAttention(studentViews(data, { ...filter, sessions: [1] }));
    // Session 1 alone has no change to judge; only the missed C2 results remain.
    expect(first.map((a) => [a.student.child.id, a.items.map((i) => i.reason)])).toEqual([
      [2, ['none']],
      [4, ['none']],
    ]);
  });

  it('flags a student who missed the latest session the others had', () => {
    const later = {
      ...data,
      records: new Map([
        [
          1,
          [
            record(1, [session(1, 'beginning'), session(2, 'progressing')]),
            record(2, [session(1, 'progressing')]),
          ],
        ],
      ]),
    };
    const [one, two] = studentViews(later, { ...filter, sessions: [1, 2] });
    expect(one.items[0].missed).toBeNull();
    expect(two.items[0].missed).toBe(2);
    expect(needsAttention([one, two]).map((a) => a.student.child.id)).toEqual([2]);
  });
});
