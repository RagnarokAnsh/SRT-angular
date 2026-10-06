import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '../i18n/language';

interface Named {
  slug: string;
  name: string;
}

interface Described {
  slug: string;
  description: string;
}

/**
 * Display text for domains and competencies. Names and descriptions come from the API in
 * English; other languages use the translations in `catalog.*`, falling back to the API
 * text for anything not translated yet.
 */
@Injectable({ providedIn: 'root' })
export class CatalogText {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  domainName(domain: Named): string {
    return this.pick(`catalog.domains.${domain.slug}.name`, domain.name);
  }

  competencyName(competency: Named): string {
    return this.pick(`catalog.competencies.${competency.slug}.name`, competency.name);
  }

  competencyDescription(competency: Described): string {
    return this.pick(`catalog.competencies.${competency.slug}.description`, competency.description);
  }

  /** Static framework text (no API data), e.g. on the public home page. */
  framework(key: string): string {
    this.language.current();
    return this.transloco.translate(key);
  }

  private pick(key: string, apiText: string): string {
    const lang = this.language.current();
    const text = apiText?.trim() ?? '';
    if (lang === 'en' && text) return text;
    const translated = this.transloco.translate(key, {}, lang);
    return translated && translated !== key ? translated : text;
  }
}
