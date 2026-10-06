import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

import { DEFAULT_LANGUAGE, type LanguageCode, isLanguageCode } from './languages';

/**
 * One lazy chunk per language (fingerprinted by the build), so a deploy never serves stale
 * text from the browser cache. The files live in `src/i18n/`; a language added to
 * `LANGUAGES` doesn't compile until it has an entry here.
 */
const FILES: Record<LanguageCode, () => Promise<{ default: unknown }>> = {
  en: () => import('../../../i18n/en.json'),
  hi: () => import('../../../i18n/hi.json'),
};

@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    const load = FILES[isLanguageCode(lang) ? lang : DEFAULT_LANGUAGE];
    return load().then((m) => m.default as Translation);
  }
}
