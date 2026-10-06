import type { TranslationParams } from './params';

interface Translator {
  translate(key: string, params?: TranslationParams): string;
}

/**
 * Translates a plural key: `key.one` / `key.other` (CLDR rules for `locale`), with `{{count}}`
 * formatted for the locale. Falls back to `key.other` when there is no entry for the rule.
 */
export function translatePlural(
  translator: Translator,
  locale: string,
  key: string,
  count: number,
  params: TranslationParams = {},
): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const values = { ...params, count: new Intl.NumberFormat(locale).format(count) };
  const specific = `${key}.${rule}`;
  const text = translator.translate(specific, values);
  return text === specific ? translator.translate(`${key}.other`, values) : text;
}
