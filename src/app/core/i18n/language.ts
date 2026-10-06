import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';

import {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  type LanguageCode,
  isLanguageCode,
  languageInfo,
} from './languages';

export const LANGUAGE_STORAGE_KEY = 'srt-language';

/** The active UI language: switches Transloco, remembers the choice, sets `<html lang>`. */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);
  private readonly currentSignal = signal<LanguageCode>(DEFAULT_LANGUAGE);

  readonly languages = LANGUAGES;
  readonly current = this.currentSignal.asReadonly();
  readonly info = computed(() => languageInfo(this.currentSignal()));
  /** BCP 47 locale for dates and numbers (en-IN gives dd/mm/yyyy). */
  readonly locale = computed(() => this.info().locale);

  /** Loads the saved (or browser) language before the first render. */
  init(): Promise<unknown> {
    const lang = this.detect();
    this.apply(lang);
    return firstValueFrom(this.transloco.load(lang));
  }

  /**
   * Switches language once its translations are loaded, so nothing renders half-translated.
   * If they can't be loaded (e.g. offline before the file was ever fetched), nothing changes.
   */
  use(lang: LanguageCode): Promise<boolean> {
    if (!isLanguageCode(lang)) return Promise.resolve(false);
    if (lang === this.currentSignal()) return Promise.resolve(true);
    return firstValueFrom(this.transloco.load(lang)).then(
      () => {
        this.apply(lang);
        try {
          localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
        } catch {
          /* not persisted; fine for this visit */
        }
        return true;
      },
      () => false,
    );
  }

  private apply(lang: LanguageCode): void {
    this.transloco.setActiveLang(lang);
    this.currentSignal.set(lang);
    this.document.documentElement.lang = lang;
  }

  private detect(): LanguageCode {
    try {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (isLanguageCode(saved)) return saved;
    } catch {
      /* ignore */
    }
    const browser = this.document.defaultView?.navigator?.languages ?? [];
    return browser.some((l) => l.toLowerCase().startsWith('hi')) ? 'hi' : DEFAULT_LANGUAGE;
  }
}
