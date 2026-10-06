export const LANGUAGES = [
  { code: 'en', label: 'English', short: 'EN', locale: 'en-IN' },
  { code: 'hi', label: 'हिंदी', short: 'हिं', locale: 'hi-IN' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = 'en';

export function isLanguageCode(value: unknown): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

export function languageInfo(code: LanguageCode): Language {
  return LANGUAGES.find((language) => language.code === code) ?? LANGUAGES[0];
}
