import { Pipe, type PipeTransform, inject } from '@angular/core';

import { LanguageService } from '@core/i18n/language';
import { type IsoDate, formatIsoDate } from '@core/util/dates';

/** Formats a `YYYY-MM-DD` date in the active language (en-IN: 10 May 2020, hi-IN: 10 मई 2020). */
@Pipe({ name: 'appDate', pure: false })
export class AppDatePipe implements PipeTransform {
  private readonly language = inject(LanguageService);

  transform(
    value: IsoDate | null | undefined,
    style: 'short' | 'medium' | 'long' = 'medium',
  ): string {
    return value ? formatIsoDate(value, this.language.locale(), style) : '—';
  }
}
