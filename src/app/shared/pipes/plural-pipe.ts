import { Pipe, type PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';
import type { TranslationParams } from '@core/i18n/params';
import { translatePlural } from '@core/i18n/plural';

/**
 * Plural-aware translation: `{{ 'children.count' | plural: n }}` uses `children.count.one`
 * or `children.count.other` (CLDR rules for the active language) with `{{count}}` = n.
 */
@Pipe({ name: 'plural', pure: false })
export class PluralPipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  transform(key: string, count: number, params: TranslationParams = {}): string {
    return translatePlural(this.transloco, this.language.locale(), key, count, params);
  }
}
