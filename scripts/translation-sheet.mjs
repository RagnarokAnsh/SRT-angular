// Writes every text of the app, in English, to a spreadsheet for translators: one row per
// text with its key, the English, an empty column for the translation, where it appears and
// what to keep (placeholders, line breaks, singular and plural).
// Usage: node scripts/translation-sheet.mjs [Language] [output.xlsx]
//   e.g. node scripts/translation-sheet.mjs Assamese docs/translations/translations-assamese.xlsx
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import writeXlsxFile from 'write-excel-file/node';

const root = new URL('..', import.meta.url).pathname;
const language = process.argv[2] ?? 'Assamese';
const output = resolve(
  process.argv[3] ?? join(root, `docs/translations/translations-${language.toLowerCase()}.xlsx`),
);
const en = JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8'));

/** Where each group of texts appears, for the translators. */
const AREAS = {
  app: 'App name',
  nav: 'Menus',
  language: 'Language menu',
  roles: 'User roles',
  common: 'Buttons and common words',
  logout: 'Signing out',
  unsaved: 'Unsaved changes',
  network: 'Connection messages',
  errors: 'Error messages',
  validation: 'Form messages',
  age: 'Age',
  demo: 'Demo version only',
  home: 'Home page',
  login: 'Sign-in page',
  unauthorized: 'No access page',
  notFound: 'Page not found',
  catalog: 'Domains and competencies',
  levels: 'Levels',
  units: 'Units',
  competencies: 'School Readiness – Domains',
  domainPage: 'Domain page',
  competencyDetail: 'Competency page',
  assessment: 'Assessment',
  children: 'Students list',
  childForm: 'Student form',
  dashboard: 'Dashboard',
  location: 'Locations',
  officials: 'Officials',
  admin: 'Administration',
};

function* entries(tree, prefix = '') {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object') yield* entries(value, path);
    else yield [path, String(value)];
  }
}

function notes(key, text) {
  const out = [];
  const placeholders = [...new Set(text.match(/\{\{\s*\w+\s*\}\}/g) ?? [])];
  if (placeholders.length) {
    out.push(`Keep ${placeholders.join(', ')} as it is: the app puts a value there.`);
  }
  if (text.includes('\n')) out.push('Keep the line break.');
  if (key.endsWith('.one')) out.push('Used for exactly 1.');
  if (key.endsWith('.other')) out.push('Used for any other number.');
  if (/^catalog\..*\.wheel$/.test(key)) out.push('Short label on the wheel: keep it short.');
  if (key.startsWith('demo.')) out.push('Only in the demo version; can be left for last.');
  return out.join(' ');
}

const header = (value) => ({
  value,
  fontWeight: 'bold',
  backgroundColor: '#FDE8E3',
  alignVertical: 'center',
});
const cell = (value) => ({ value, type: String, wrap: true, alignVertical: 'top' });

const rows = [...entries(en)];
const texts = [
  [
    header('Key (do not change)'),
    header('English'),
    header(language),
    header('Where'),
    header('Notes'),
  ],
  ...rows.map(([key, text]) => [
    cell(key),
    cell(text),
    cell(''),
    cell(AREAS[key.split('.')[0]] ?? ''),
    cell(notes(key, text)),
  ]),
];

const readMe = [
  [
    {
      value: `School Ready Children: texts to translate into ${language}`,
      fontWeight: 'bold',
      fontSize: 14,
    },
  ],
  [],
  [cell(`1. Write the ${language} text in column C of the "Texts" sheet, next to the English.`)],
  [cell('2. Do not change column A (the key): the app finds each text by it.')],
  [
    cell(
      '3. Keep anything in double curly brackets, like {{count}} or {{name}}, exactly as it is. The app replaces it with a number or a name. You may move it within the sentence.',
    ),
  ],
  [cell('4. Keep line breaks where the English has one (for example, short labels on the wheel).')],
  [
    cell(
      '5. Rows ending in ".one" are used for exactly 1, and rows ending in ".other" for any other number (for example "1 student" and "5 students").',
    ),
  ],
  [cell('6. Column D says where the text appears in the app; column E has notes for that row.')],
  [],
  [cell(`${rows.length} texts in total.`)],
];

mkdirSync(dirname(output), { recursive: true });
await writeXlsxFile([readMe, texts], {
  sheets: ['How to fill', 'Texts'],
  columns: [
    [{ width: 110 }],
    [{ width: 42 }, { width: 60 }, { width: 60 }, { width: 26 }, { width: 46 }],
  ],
  stickyRowsCount: 1,
  filePath: output,
});
console.log(`Wrote ${rows.length} texts to ${output}`);
