import { Injectable } from '@angular/core';
import type { Translation, TranslocoLoader } from '@jsverse/transloco';

/**
 * Translations are bundled as lazy chunks (fingerprinted by the build), so a deploy never
 * serves stale text from the browser cache. The files live in `src/i18n/`.
 */
@Injectable({ providedIn: 'root' })
export class TranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    switch (lang) {
      case 'hi':
        return import('../../../i18n/hi.json').then((m) => m.default as Translation);
      default:
        return import('../../../i18n/en.json').then((m) => m.default as Translation);
    }
  }
}
