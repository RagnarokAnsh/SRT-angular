import { type ElementRef, type Injector, afterNextRender } from '@angular/core';
import type { AbstractControl, FormGroup } from '@angular/forms';

import type { AppError } from '@core/network/app-error';

/** Marks every control touched and focuses the first invalid field; returns false if invalid. */
export function validateAndFocus(form: FormGroup, host: ElementRef<HTMLElement>): boolean {
  form.markAllAsTouched();
  if (form.valid) return true;
  const invalid = host.nativeElement.querySelector<HTMLElement>(
    'input.ng-invalid, select.ng-invalid, textarea.ng-invalid, mat-select.ng-invalid, [formcontrolname].ng-invalid input',
  );
  invalid?.focus();
  return false;
}

/**
 * Puts Laravel validation errors (422 `errors`) on the matching controls. Returns the
 * messages that matched no control the user can see (missing, disabled or `hidden`), so they
 * can be shown elsewhere.
 */
export function applyServerErrors(
  form: FormGroup,
  fieldErrors: Record<string, string[]>,
  fieldMap: Record<string, string> = {},
  hidden: readonly string[] = [],
): string[] {
  const unmatched: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const name = fieldMap[field] ?? field;
    const control: AbstractControl | null = form.get(name);
    if (control && control.enabled && !hidden.includes(name) && messages.length) {
      control.setErrors({ ...control.errors, server: messages[0] });
      control.markAsTouched();
    } else {
      unmatched.push(...messages);
    }
  }
  return unmatched;
}

/**
 * Drops the messages a previous save put on the fields, so a field the server objected to
 * doesn't block the next try (they are otherwise only cleared when the field changes).
 */
export function clearServerErrors(form: FormGroup): void {
  for (const control of Object.values(form.controls)) {
    if (control.hasError('server')) control.updateValueAndValidity({ emitEvent: false });
  }
}

/**
 * Shows a 422's messages: on the fields the user can see, the rest in the banner above the
 * form (the server's summary only when it sent no field messages, `fallback` when it sent
 * nothing usable). Focus moves to the first highlighted field once the page has updated.
 * Returns the banner text, or null when every message is shown on a field.
 */
export function reportServerErrors(
  form: FormGroup,
  error: AppError,
  options: {
    host: ElementRef<HTMLElement>;
    injector: Injector;
    fallback: string;
    fieldMap?: Record<string, string>;
    hidden?: readonly string[];
  },
): string | null {
  const unmatched = applyServerErrors(form, error.fieldErrors, options.fieldMap, options.hidden);
  afterNextRender(() => validateAndFocus(form, options.host), { injector: options.injector });
  if (unmatched.length) return unmatched[0];
  if (Object.keys(error.fieldErrors).length) return null;
  return error.serverMessage ?? options.fallback;
}
