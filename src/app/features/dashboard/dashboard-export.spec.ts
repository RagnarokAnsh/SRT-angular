import type { SessionResult } from '@core/models/assessment';
import type { Child } from '@core/models/child';
import type { Competency, Domain } from '@core/models/competency';

import { buildSheets, fileSafe } from './dashboard-export';
import { competencyRow, needsAttention, studentViews, summarize } from './dashboard-model';

const child = (id: number, name: string): Child => ({
  id,
  name,
  dateOfBirth: '2021-01-01',
  symbol: 'Sun',
  heightCm: 100,
  weightKg: null,
  language: 'Hindi',
  anganwadiId: 1,
  centerName: null,
  gender: 'Girl',
  awwId: null,
});

const result = (level: SessionResult['level'], raw: string): SessionResult => ({
  session: 1,
  level,
  rawObservation: raw,
  date: '2026-07-01',
  remarks: '',
  age: null,
  heightCm: null,
  weightKg: null,
});

const competency: Competency = {
  id: 1,
  name: 'Seriation',
  description: '',
  domainId: 1,
  domainName: 'Cognitive',
  slug: 'seriation',
};
const domain: Domain = { id: 1, name: 'Cognitive', slug: 'cognitive', competencies: [competency] };

describe('dashboard export', () => {
  const children = [child(1, 'Asha\u0007 Devi'), child(2, 'Ravi'), child(3, 'Meena')];
  const row = competencyRow(
    competency,
    domain,
    children,
    [
      { childId: 1, name: '', remarks: '', sessions: [result('advancing', 'Advancing')] },
      { childId: 2, name: '', remarks: '', sessions: [result(null, 'Excellent')] },
    ],
    'latest',
  );
  const attention = needsAttention(
    studentViews(
      {
        domains: [domain],
        children,
        records: new Map([
          [
            1,
            [
              {
                childId: 1,
                name: '',
                remarks: '',
                sessions: [
                  result('advancing', 'Advancing'),
                  { ...result('beginning', 'Beginning'), session: 2 },
                ],
              },
              {
                childId: 2,
                name: '',
                remarks: '',
                sessions: [result('progressing', 'Progressing')],
              },
            ],
          ],
        ]),
      },
      { domainId: null, competencyIds: [], sessions: [1, 2] },
    ),
  );
  const sheets = buildSheets(
    {
      centerName: 'Shivaji Nagar',
      filters: { domain: 'All', session: 'Latest' },
      summary: summarize(children, [row]),
      rows: [row],
      children,
      attention,
      today: '2026-07-10',
    },
    {
      t: (key, params) => (params ? `${key} ${JSON.stringify(params)}` : key),
      competencyName: (c) => c.name,
      domainName: (d) => d.name,
      formatDate: (iso) => iso ?? '',
    },
  );
  const values = (cells: (object | null)[]) =>
    cells.map((cell) => (cell as { value?: unknown } | null)?.value ?? null);

  it('counts results that are not a level in their own column, so the row adds up', () => {
    const summary = sheets[0];
    const header = values(summary.find((r) => values(r).includes('dashboard.otherResult')) ?? []);
    const data = values(summary[summary.length - 1]);
    const at = (label: string) => data[header.indexOf(label)];
    expect(at('dashboard.otherResult')).toBe(1);
    expect(at('dashboard.notAssessed')).toBe(1);
    expect(at('levels.advancing.label')).toBe(1);
    expect(at('dashboard.table.total')).toBe(3);
  });

  it('removes characters that would make the file unreadable', () => {
    const names = sheets[1].slice(1).map((r) => values(r)[0]);
    expect(names).toEqual(['Asha Devi', 'Ravi', 'Meena']);
  });

  it('keeps the stored value of a result that is not a level', () => {
    const ravi = sheets[2].find((r) => values(r)[0] === 'Ravi');
    expect(values(ravi ?? [])[3]).toBe('Excellent');
  });

  it('lists who needs attention, why, and the results behind it', () => {
    const rows = sheets[3].slice(1).map(values);
    expect(rows).toEqual([
      [
        'Asha Devi',
        'Seriation',
        'Cognitive',
        'dashboard.attention.reason.down',
        'assessment.sessionN {"n":1}: levels.advancing.label',
        'assessment.sessionN {"n":2}: levels.beginning.label',
      ],
      [
        'Meena',
        'Seriation',
        'Cognitive',
        'dashboard.attention.reason.none',
        '',
        'assessment.sessionN {"n":2}: dashboard.notAssessed',
      ],
      [
        'Ravi',
        'Seriation',
        'Cognitive',
        'dashboard.attention.reason.none',
        '',
        'assessment.sessionN {"n":2}: dashboard.notAssessed',
      ],
    ]);
  });
});

describe('fileSafe', () => {
  it('keeps letters of any script with their vowel signs', () => {
    expect(fileSafe('शिवाजी नगर')).toBe('शिवाजी-नगर');
    expect(fileSafe('Shivaji Nagar AWC (Sector 4)')).toBe('shivaji-nagar-awc-sector-4');
  });

  it('is never empty and never too long', () => {
    expect(fileSafe('---')).toBe('centre');
    expect(fileSafe('a '.repeat(100)).length).toBeLessThanOrEqual(60);
    expect(fileSafe('a '.repeat(100)).endsWith('-')).toBe(false);
  });
});
