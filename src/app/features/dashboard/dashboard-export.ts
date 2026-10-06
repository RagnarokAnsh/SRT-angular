import type { Child } from '@core/models/child';
import { LEVELS, type Level } from '@core/models/level';
import { type IsoDate, ageOn, formatAgeCompact } from '@core/util/dates';

import type { CompetencyRow, Summary } from './dashboard-model';

type Cell = {
  value?: string | number;
  fontWeight?: 'bold';
  type?: StringConstructor | NumberConstructor;
} | null;

export interface ExportText {
  /** Translates a key (with params) in the current language. */
  t: (key: string, params?: Record<string, unknown>) => string;
  competencyName: (row: CompetencyRow) => string;
  domainName: (row: CompetencyRow) => string;
  formatDate: (iso: IsoDate | null) => string;
}

export interface ExportInput {
  centerName: string;
  filters: { domain: string; session: string };
  summary: Summary;
  rows: CompetencyRow[];
  children: Child[];
  today: IsoDate;
}

const bold = (value: string | number): Cell => ({ value, fontWeight: 'bold' });
const text = (value: string | null | undefined): Cell => ({ value: value ?? '', type: String });
const num = (value: number | null | undefined): Cell =>
  value === null || value === undefined ? null : { value, type: Number };

/** A file-name-safe version of a label. */
export function fileSafe(label: string): string {
  return (
    label
      .normalize('NFKD')
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'centre'
  );
}

/** Builds the three sheets (summary, children, assessments) as rows of cells. */
export function buildSheets(input: ExportInput, txt: ExportText): Cell[][][] {
  const { t } = txt;
  const levelLabel = (level: Level) => t(`levels.${level}.label`);

  const summary: Cell[][] = [
    [bold(t('dashboard.export.title'))],
    [text(t('dashboard.export.generated')), text(txt.formatDate(input.today))],
    [text(t('dashboard.export.center')), text(input.centerName)],
    [text(t('dashboard.filterDomain')), text(input.filters.domain)],
    [text(t('dashboard.filterSession')), text(input.filters.session)],
    [],
    [text(t('dashboard.children')), num(input.summary.children)],
    [text(t('dashboard.boys')), num(input.summary.boys)],
    [text(t('dashboard.girls')), num(input.summary.girls)],
    [text(t('dashboard.export.sessionsDone')), num(input.summary.sessionsDone)],
    [text(t('dashboard.export.sessionsPossible')), num(input.summary.sessionsPossible)],
    [],
    [
      bold(t('dashboard.table.competency')),
      bold(t('dashboard.table.domain')),
      ...LEVELS.map((level) => bold(levelLabel(level))),
      bold(t('dashboard.notAssessed')),
      bold(t('dashboard.table.total')),
    ],
    ...input.rows.map((row) => [
      text(txt.competencyName(row)),
      text(txt.domainName(row)),
      ...LEVELS.map((level) => num(row.counts[level])),
      num(row.notAssessed),
      num(row.total),
    ]),
  ];

  const children: Cell[][] = [
    [
      bold(t('childForm.name')),
      bold(t('childForm.dateOfBirth')),
      bold(t('dashboard.export.age')),
      bold(t('childForm.gender')),
      bold(t('childForm.language')),
      bold(t('childForm.symbol')),
      bold(`${t('childForm.height')} (${t('units.cm')})`),
      bold(`${t('childForm.weight')} (${t('units.kg')})`),
    ],
    ...input.children.map((child) => {
      const age = child.dateOfBirth ? ageOn(child.dateOfBirth, input.today) : null;
      return [
        text(child.name),
        text(txt.formatDate(child.dateOfBirth)),
        text(age ? formatAgeCompact(age) : ''),
        text(child.gender),
        text(child.language),
        text(child.symbol),
        num(child.heightCm),
        num(child.weightKg),
      ];
    }),
  ];

  const sessions = [1, 2, 3, 4] as const;
  const assessments: Cell[][] = [
    [
      bold(t('childForm.name')),
      bold(t('dashboard.table.competency')),
      bold(t('dashboard.table.domain')),
      ...sessions.flatMap((n) => [
        bold(t('assessment.sessionN', { n })),
        bold(`${t('assessment.sessionN', { n })}: ${t('dashboard.export.date')}`),
      ]),
    ],
    ...input.rows.flatMap((row) =>
      row.progress
        .filter((p) => p.sessions.length > 0)
        .map((p) => [
          text(p.child.name),
          text(txt.competencyName(row)),
          text(txt.domainName(row)),
          ...sessions.flatMap((n) => {
            const s = p.sessions.find((x) => x.session === n);
            return [
              text(s ? (s.level ? levelLabel(s.level) : s.rawObservation) : ''),
              text(s ? txt.formatDate(s.date) : ''),
            ];
          }),
        ]),
    ),
  ];

  return [summary, children, assessments];
}

/** Writes the dashboard to an .xlsx file (the library is only downloaded when needed). */
export async function exportDashboard(input: ExportInput, txt: ExportText): Promise<void> {
  const { default: writeXlsxFile } = await import('write-excel-file');
  const sheets = buildSheets(input, txt);
  await writeXlsxFile(sheets as never, {
    sheets: [
      txt.t('dashboard.export.sheetSummary'),
      txt.t('dashboard.export.sheetChildren'),
      txt.t('dashboard.export.sheetAssessments'),
    ],
    fileName: `srt-dashboard-${fileSafe(input.centerName)}-${input.today}.xlsx`,
  });
}
