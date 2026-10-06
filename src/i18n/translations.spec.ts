import { FRAMEWORK } from '@core/catalog/framework';
import { ROLE_NAMES } from '@core/models/role';

import en from './en.json';
import hi from './hi.json';

interface Tree {
  [key: string]: string | Tree;
}

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') result[path] = value;
    else Object.assign(result, flatten(value, path));
  }
  return result;
}

const placeholders = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

const english = flatten(en as Tree);
const hindi = flatten(hi as Tree);

describe('translations', () => {
  it('Hindi has exactly the same keys as English', () => {
    expect(Object.keys(hindi).sort()).toEqual(Object.keys(english).sort());
  });

  it('uses the same placeholders in both languages', () => {
    for (const [key, text] of Object.entries(english)) {
      expect({ key, placeholders: placeholders(hindi[key] ?? '') }).toEqual({
        key,
        placeholders: placeholders(text),
      });
    }
  });

  it('has no empty strings', () => {
    for (const [key, text] of [...Object.entries(english), ...Object.entries(hindi)]) {
      expect({ key, empty: !text.trim() }).toEqual({ key, empty: false });
    }
  });

  it('names every role', () => {
    for (const role of ROLE_NAMES) expect(english[`roles.${role}`]).toBeTruthy();
  });

  it('covers every domain and competency of the framework', () => {
    for (const domain of FRAMEWORK) {
      expect(english[`catalog.domains.${domain.slug}.name`]).toBeTruthy();
      expect(english[`catalog.domains.${domain.slug}.wheel`]).toBeTruthy();
      for (const slug of domain.competencies) {
        for (const field of ['name', 'wheel', 'description']) {
          expect(english[`catalog.competencies.${slug}.${field}`]).toBeTruthy();
        }
      }
    }
  });

  it('keeps wheel labels to at most two lines', () => {
    for (const [key, text] of [...Object.entries(english), ...Object.entries(hindi)]) {
      if (key.endsWith('.wheel')) expect({ key, lines: text.split('\n').length <= 2 }).toEqual({ key, lines: true });
    }
  });
});
