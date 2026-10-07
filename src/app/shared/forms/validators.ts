import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

import { type IsoDate, ageOn, isValidIsoDate, toIsoDate } from '@core/util/dates';
import { hasControlCharacters, toAsciiDigits } from '@core/util/text';

export const EMAIL_MAX = 254;
export const PASSWORD_MAX = 128;
export const PASSWORD_MIN = 8;
export const NAME_MAX = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;
/**
 * Letters and combining marks of any script, plus spaces and . ' - (e.g. "D'Souza", "अनन्या").
 * Zero-width (non-)joiners are allowed inside: Hindi and Marathi keyboards use them to shape
 * conjuncts.
 */
const NAME_PATTERN = /^[\p{L}\p{M}](?:[\p{L}\p{M} .'’-]|\u200C|\u200D)*$/u;

function text(control: AbstractControl): string {
  return typeof control.value === 'string' ? control.value.trim() : '';
}

function isEmpty(control: AbstractControl): boolean {
  const value: unknown = control.value;
  return (
    value === null || value === undefined || (typeof value === 'string' && value.trim() === '')
  );
}

/** Like `Validators.required`, but whitespace alone does not count. */
export const requiredText: ValidatorFn = (control) =>
  isEmpty(control) ? { required: true } : null;

/** At least `min` characters once surrounding spaces are removed. */
export function minTextLength(min: number): ValidatorFn {
  return (control) => {
    if (isEmpty(control)) return null;
    return Array.from(text(control)).length < min
      ? { minlength: { requiredLength: min, actualLength: Array.from(text(control)).length } }
      : null;
  };
}

/** A positive whole number, e.g. an id taken from the address bar. */
export function isPositiveId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** An email address with a domain such as `name@example.org`. */
export const emailAddress: ValidatorFn = (control) => {
  if (isEmpty(control)) return null;
  return EMAIL_PATTERN.test(text(control)) ? null : { email: true };
};

/** A person's name in any script. */
export const personName: ValidatorFn = (control) => {
  if (isEmpty(control)) return null;
  const value = text(control);
  if (hasControlCharacters(value) || !NAME_PATTERN.test(value)) {
    return { personName: { key: 'validation.personName' } };
  }
  return null;
};

/** A language name in any script ("Hindi", "हिंदी", "Bhili"): letters and spaces only. */
export const languageName: ValidatorFn = (control) => {
  if (isEmpty(control)) return null;
  return /^[\p{L}\p{M}](?:[\p{L}\p{M} ]|\u200C|\u200D)*$/u.test(text(control))
    ? null
    : { languageName: { key: 'validation.languageName' } };
};

/** A centre code such as "AWC-JP-001": letters, digits, - _ / and spaces. */
export const centerCode: ValidatorFn = (control) => {
  if (isEmpty(control)) return null;
  return /^[A-Za-z0-9][A-Za-z0-9\-_/ ]*$/.test(text(control))
    ? null
    : { centerCode: { key: 'validation.centerCode' } };
};

/** Rejects control characters (pasted from other apps) in free text. */
export const plainText: ValidatorFn = (control) =>
  typeof control.value === 'string' && hasControlCharacters(control.value)
    ? { plainText: { key: 'validation.plainText' } }
    : null;

/** At least {@link PASSWORD_MIN} characters with a letter and a digit. */
export const strongPassword: ValidatorFn = (control) => {
  const value = typeof control.value === 'string' ? control.value : '';
  if (!value) return null;
  if (value.length < PASSWORD_MIN || !/\p{L}/u.test(value) || !/\d/.test(value)) {
    return { strongPassword: { key: 'validation.strongPassword', params: { min: PASSWORD_MIN } } };
  }
  return null;
};

/** A `YYYY-MM-DD` date that exists and is not after `today`. */
export function pastIsoDate(today: () => IsoDate = () => toIsoDate()): ValidatorFn {
  return (control) => {
    if (isEmpty(control)) return null;
    const value = text(control);
    if (!isValidIsoDate(value)) return { isoDate: { key: 'validation.date' } };
    return value > today() ? { dateInFuture: { key: 'validation.dateInFuture' } } : null;
  };
}

/** Date of birth giving an age (in whole years) from `min` up to, not including, `max`. */
export function ageInRange(
  min: number,
  max: number,
  today: () => IsoDate = () => toIsoDate(),
): ValidatorFn {
  return (control) => {
    if (isEmpty(control)) return null;
    const age = ageOn(text(control), today());
    if (!age) return null; // reported by pastIsoDate
    return age.years < min || age.years >= max
      ? { ageRange: { key: 'validation.ageRange', params: { min, max } } }
      : null;
  };
}

/**
 * A number between `min` and `max` with at most `decimals` decimal places. Devanagari digits
 * count too (read them with {@link toAsciiDigits}).
 */
export function decimalInRange(min: number, max: number, decimals = 1): ValidatorFn {
  const pattern = new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
  return (control): ValidationErrors | null => {
    if (isEmpty(control)) return null;
    const raw = toAsciiDigits(String(control.value).trim());
    if (!pattern.test(raw)) {
      return { decimal: { key: 'validation.decimal', count: decimals } };
    }
    const value = Number(raw);
    return value < min || value > max
      ? { range: { key: 'validation.range', params: { min, max } } }
      : null;
  };
}
