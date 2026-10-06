import { Pipe, type PipeTransform, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';
import { type Age, type IsoDate, ageOn, parseAgeCompact, toIsoDate } from '@core/util/dates';

/**
 * Age in years and months, translated: `{{ child.dateOfBirth | age }}` -> "5 y 6 m".
 * Also accepts the API's stored form ("5y 2m") and Age objects.
 */
@Pipe({ name: 'age', pure: false })
export class AgePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  transform(value: IsoDate | Age | string | null | undefined, on: IsoDate = toIsoDate()): string {
    this.language.current();
    let age: Age | null = null;
    if (value && typeof value === 'object') age = value;
    else if (typeof value === 'string') age = parseAgeCompact(value) ?? ageOn(value, on);
    if (!age) return typeof value === 'string' && value.trim() ? value : '—';
    return this.transloco.translate('age.yearsMonths', { years: age.years, months: age.months });
  }
}
