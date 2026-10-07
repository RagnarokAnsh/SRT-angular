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
  /** The language asked for last: a slower, earlier switch must not win. */
  private requested: LanguageCode = DEFAULT_LANGUAGE;

  readonly languages = LANGUAGES;
  readonly current = this.currentSignal.asReadonly();
  readonly info = computed(() => languageInfo(this.currentSignal()));
  /** BCP 47 locale for dates and numbers (en-IN gives dd/mm/yyyy). */
  readonly locale = computed(() => this.info().locale);

  /**
   * Loads the saved (or browser) language before the first render. If it can't be loaded
   * (e.g. a stale copy of the app after a deploy), falls back to English; the app always
   * starts, even if no translations could be loaded at all.
   */
  async init(): Promise<void> {
    const lang = this.detect();
    this.requested = lang;
    this.apply(lang);
    const loaded = await this.load(lang);
    if (loaded || lang === DEFAULT_LANGUAGE) return;
    console.error(`Could not load the "${lang}" translations`);
    this.requested = DEFAULT_LANGUAGE;
    this.apply(DEFAULT_LANGUAGE);
    await this.load(DEFAULT_LANGUAGE);
  }

  /**
   * Switches language once its translations are loaded, so nothing renders half-translated.
   * If they can't be loaded (e.g. offline before the file was ever fetched), nothing changes.
   */
  async use(lang: LanguageCode): Promise<boolean> {
    if (!isLanguageCode(lang)) return false;
    this.requested = lang;
    if (lang === this.currentSignal()) return true;
    const loaded = await this.load(lang);
    // Another language was chosen while this one loaded: that choice wins.
    if (this.requested !== lang) return false;
    if (!loaded) return false;
    this.apply(lang);
    this.remember(lang);
    return true;
  }

  /** Keeps the choice for the next visit (and for a reload after a failed switch). */
  remember(lang: LanguageCode): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* not persisted; fine for this visit */
    }
  }

  /**
   * Loads a language's translations. True only when that language's own text arrived:
   * when it fails, Transloco may answer with the fallback's text instead, which must not
   * count (the page would say हिंदी and show English).
   */
  private async load(lang: LanguageCode): Promise<boolean> {
    try {
      await firstValueFrom(this.transloco.load(lang));
    } catch {
      return false;
    }
    return Object.keys(this.transloco.getTranslation(lang)).length > 0;
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
    // The first of the browser's languages (in the user's order) that the app has.
    const browser = this.document.defaultView?.navigator?.languages ?? [];
    for (const tag of browser) {
      const code = tag.toLowerCase().split('-')[0];
      if (isLanguageCode(code)) return code;
    }
    return DEFAULT_LANGUAGE;
  }
}
