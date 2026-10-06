import type { TranslationParams } from './params';
import { translatePlural } from './plural';

const catalog: Record<string, string> = {
  'children.count.one': '{{count}} child',
  'children.count.other': '{{count}} children',
  'assessment.saved.one': '{{count}} बच्चे का आकलन सहेजा गया।',
  'assessment.saved.other': '{{count}} बच्चों का आकलन सहेजा गया।',
  'only.other': '{{count}} items in {{place}}',
};

// Same contract as Transloco: unknown keys come back unchanged.
const translator = {
  translate: (key: string, params: TranslationParams = {}) =>
    (catalog[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(params[name])),
};

describe('translatePlural', () => {
  it('picks the CLDR form for the language', () => {
    expect(translatePlural(translator, 'en-IN', 'children.count', 1)).toBe('1 child');
    expect(translatePlural(translator, 'en-IN', 'children.count', 0)).toBe('0 children');
    expect(translatePlural(translator, 'en-IN', 'children.count', 3)).toBe('3 children');
    // Hindi treats 0 and 1 as "one".
    expect(translatePlural(translator, 'hi-IN', 'assessment.saved', 0)).toBe(
      '0 बच्चे का आकलन सहेजा गया।',
    );
    expect(translatePlural(translator, 'hi-IN', 'assessment.saved', 4)).toBe(
      '4 बच्चों का आकलन सहेजा गया।',
    );
  });

  it('formats the count for the locale', () => {
    expect(translatePlural(translator, 'en-IN', 'children.count', 120000)).toBe(
      '1,20,000 children',
    );
  });

  it('falls back to "other" and passes extra parameters through', () => {
    expect(translatePlural(translator, 'en-IN', 'only', 1, { place: 'Jaipur' })).toBe(
      '1 items in Jaipur',
    );
  });
});
