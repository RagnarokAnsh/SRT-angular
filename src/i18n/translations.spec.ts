import { FRAMEWORK } from '@core/catalog/framework';
import type { LanguageCode } from '@core/i18n/languages';
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

const placeholders = (text: string) =>
  [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

/** Every language file; a language added to `LANGUAGES` doesn't compile until it's listed. */
const FILES: Record<LanguageCode, Tree> = { en: en as Tree, hi: hi as Tree };

const languages = Object.entries(FILES).map(([code, tree]) => ({ code, texts: flatten(tree) }));
const english = flatten(FILES.en);
const allTexts = languages.flatMap(({ code, texts }) =>
  Object.entries(texts).map(([key, text]) => ({ key: `${code}:${key}`, text })),
);

describe('translations', () => {
  for (const { code, texts } of languages.filter((l) => l.code !== 'en')) {
    it(`${code} has exactly the same keys as English`, () => {
      expect(Object.keys(texts).sort()).toEqual(Object.keys(english).sort());
    });

    it(`${code} uses the same placeholders as English`, () => {
      for (const [key, text] of Object.entries(english)) {
        expect({ key, placeholders: placeholders(texts[key] ?? '') }).toEqual({
          key,
          placeholders: placeholders(text),
        });
      }
    });
  }

  it('has no empty strings', () => {
    for (const { key, text } of allTexts) {
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
    for (const { key, text } of allTexts) {
      if (key.endsWith('.wheel'))
        expect({ key, lines: text.split('\n').length <= 2 }).toEqual({ key, lines: true });
    }
  });
});
