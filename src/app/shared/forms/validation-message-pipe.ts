import { Pipe, type PipeTransform, inject } from '@angular/core';
import type { ValidationErrors } from '@angular/forms';
import { TranslocoService } from '@jsverse/transloco';

import { LanguageService } from '@core/i18n/language';
import type { TranslationParams } from '@core/i18n/params';
import { translatePlural } from '@core/i18n/plural';

/** Translation key (and params) for a validator error, or raw server text. */
export interface ValidationMessage {
  key?: string;
  params?: TranslationParams;
  /** Makes `key` a plural key (`.one` / `.other`) with this `{{count}}`. */
  count?: number;
  /** Message from the server (already in words), shown as is. */
  text?: string;
}

const BUILT_IN: Record<string, (value: Record<string, unknown>) => ValidationMessage> = {
  required: () => ({ key: 'validation.required' }),
  email: () => ({ key: 'validation.email' }),
  minlength: (v) => ({ key: 'validation.minLength', params: { min: v['requiredLength'] } }),
  maxlength: (v) => ({ key: 'validation.maxLength', params: { max: v['requiredLength'] } }),
  min: (v) => ({ key: 'validation.min', params: { min: v['min'] } }),
  max: (v) => ({ key: 'validation.max', params: { max: v['max'] } }),
  pattern: () => ({ key: 'validation.pattern' }),
};

/** The message for the first error of a control (custom validators return `{ key, params }`). */
export function validationMessage(
  errors: ValidationErrors | null | undefined,
): ValidationMessage | null {
  if (!errors) return null;
  const entries = Object.entries(errors);
  if (!entries.length) return null;
  const [name, value] = entries[0];
  if (name === 'server' && typeof value === 'string') return { text: value };
  const builtIn = BUILT_IN[name];
  if (builtIn) return builtIn((value ?? {}) as Record<string, unknown>);
  if (value && typeof value === 'object' && typeof (value as ValidationMessage).key === 'string') {
    return value as ValidationMessage;
  }
  return { key: 'validation.invalid' };
}

/** `<mat-error>{{ control.errors | validationMessage }}</mat-error>` */
@Pipe({ name: 'validationMessage', pure: false })
export class ValidationMessagePipe implements PipeTransform {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);

  transform(errors: ValidationErrors | null | undefined, params: TranslationParams = {}): string {
    this.language.current();
    const message = validationMessage(errors);
    if (!message) return '';
    if (message.text) return message.text;
    const values = { ...params, ...message.params };
    const key = message.key ?? 'validation.invalid';
    return message.count === undefined
      ? this.transloco.translate(key, values)
      : translatePlural(this.transloco, this.language.locale(), key, message.count, values);
  }
}
