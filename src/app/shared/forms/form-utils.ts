import type { ElementRef } from '@angular/core';
import type { AbstractControl, FormGroup } from '@angular/forms';

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
 * messages that matched no control, so they can be shown elsewhere.
 */
export function applyServerErrors(
  form: FormGroup,
  fieldErrors: Record<string, string[]>,
  fieldMap: Record<string, string> = {},
): string[] {
  const unmatched: string[] = [];
  for (const [field, messages] of Object.entries(fieldErrors)) {
    const control: AbstractControl | null = form.get(fieldMap[field] ?? field);
    if (control && messages.length) {
      control.setErrors({ ...control.errors, server: messages[0] });
      control.markAsTouched();
    } else {
      unmatched.push(...messages);
    }
  }
  return unmatched;
}
