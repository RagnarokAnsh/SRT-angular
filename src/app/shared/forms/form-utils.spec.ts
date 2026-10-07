import { ElementRef, Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import type { AppError } from '@core/network/app-error';

import { applyServerErrors, clearServerErrors, reportServerErrors } from './form-utils';

const form = () =>
  new FormGroup({
    name: new FormControl('Asha', Validators.required),
    email: new FormControl('a@b.org'),
    centre: new FormControl<number | null>(3),
    password: new FormControl({ value: '', disabled: true }),
  });

const validation = (fieldErrors: Record<string, string[]>, serverMessage: string | null) =>
  ({ kind: 'validation', fieldErrors, serverMessage }) as unknown as AppError;

describe('applyServerErrors', () => {
  it('puts messages on the matching fields and returns the rest', () => {
    const f = form();
    const rest = applyServerErrors(
      f,
      { name: ['Too short.'], anganwadi_id: ['Bad centre.'], other: ['Something else.'] },
      { anganwadi_id: 'centre' },
      ['centre'],
    );
    expect(f.controls.name.errors).toEqual({ server: 'Too short.' });
    // The centre isn't on screen: its message must not get lost on a hidden field.
    expect(f.controls.centre.errors).toBeNull();
    expect(rest).toEqual(['Bad centre.', 'Something else.']);
  });

  it('never hides a message on a disabled field', () => {
    expect(applyServerErrors(form(), { password: ['Too weak.'] })).toEqual(['Too weak.']);
  });
});

describe('clearServerErrors', () => {
  it("drops the server's messages but keeps the form's own checks", () => {
    const f = form();
    applyServerErrors(f, { email: ['Taken.'] });
    f.controls.name.setValue('');
    clearServerErrors(f);
    expect(f.controls.email.errors).toBeNull();
    expect(f.controls.name.errors).toEqual({ required: true });
  });
});

describe('reportServerErrors', () => {
  const options = () => ({
    host: new ElementRef(document.createElement('form')),
    injector: TestBed.inject(Injector),
    fallback: 'Not accepted.',
  });

  it('shows no banner when every message is on a field', () => {
    expect(
      reportServerErrors(
        form(),
        validation({ name: ['Too short.'] }, 'The name is too short.'),
        options(),
      ),
    ).toBeNull();
  });

  it('shows a message that has no field in the banner', () => {
    expect(reportServerErrors(form(), validation({ age: ['Too old.'] }, null), options())).toBe(
      'Too old.',
    );
  });

  it("uses the server's summary only without field messages, and the fallback without both", () => {
    expect(reportServerErrors(form(), validation({}, 'Centre is full.'), options())).toBe(
      'Centre is full.',
    );
    expect(reportServerErrors(form(), validation({}, null), options())).toBe('Not accepted.');
  });
});
