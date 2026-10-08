// Checks that every translation key written literally in the code exists in src/i18n/en.json
// (the unit tests already check that hi.json has the same keys and placeholders as en.json).
// Usage: node scripts/check-translations.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function flatten(tree, prefix = '', out = new Set()) {
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path); // groups count too (plural keys like "x.count" have .one/.other)
    if (value && typeof value === 'object') flatten(value, path, out);
  }
  return out;
}

function* files(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (/\.(ts|html)$/.test(name) && !name.endsWith('.spec.ts')) yield path;
  }
}

const KEY = String.raw`([a-zA-Z][\w-]*(?:\.[\w-]+)+)`;
const patterns = [
  new RegExp(String.raw`'${KEY}'\s*\|\s*(?:transloco|plural)`, 'g'),
  new RegExp(String.raw`translate\(\s*'${KEY}'`, 'g'),
  new RegExp(String.raw`(?:Key|title|labelKey|roleKey|intro)\s*[:=]\s*'${KEY}'`, 'g'),
  new RegExp(String.raw`(?:errorKey|success|successCount|info)\(\s*'${KEY}'`, 'g'),
  new RegExp(String.raw`key:\s*'(validation\.[\w-]+)'`, 'g'),
  new RegExp(String.raw`'(errors\.[\w-]+)'`, 'g'),
];

const known = flatten(JSON.parse(readFileSync(join(root, 'src/i18n/en.json'), 'utf8')));
const missing = [];
for (const file of files(join(root, 'src/app'))) {
  const text = readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const key = match[1];
      if (key.includes('/') || key.startsWith('assets.')) continue;
      if (!known.has(key)) missing.push(`${relative(root, file)}: ${key}`);
    }
  }
}

if (missing.length) {
  console.error(`Missing from src/i18n/en.json:\n  ${[...new Set(missing)].join('\n  ')}`);
  process.exit(1);
}
console.log(`Translation keys OK (${known.size} keys and groups in en.json).`);
