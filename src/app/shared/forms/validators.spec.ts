import { FormControl } from '@angular/forms';

import {
  ageInRange,
  decimalInRange,
  emailAddress,
  pastIsoDate,
  personName,
  plainText,
  requiredText,
  strongPassword,
} from './validators';

const check = (validator: (c: FormControl) => unknown, value: unknown) =>
  validator(new FormControl(value));

describe('validators', () => {
  it('requiredText ignores whitespace-only input', () => {
    expect(check(requiredText, '   ')).toEqual({ required: true });
    expect(check(requiredText, null)).toEqual({ required: true });
    expect(check(requiredText, 'a')).toBeNull();
  });

  it('emailAddress needs a domain with a dot', () => {
    expect(check(emailAddress, 'name@example.org')).toBeNull();
    expect(check(emailAddress, ' name@example.co.in ')).toBeNull();
    expect(check(emailAddress, 'name@localhost')).toEqual({ email: true });
    expect(check(emailAddress, 'name example@x.org')).toEqual({ email: true });
    expect(check(emailAddress, '')).toBeNull();
  });

  it('personName accepts names in any script and rejects digits and symbols', () => {
    for (const name of ['Aarav Kumar', "D'Souza", 'Anne-Marie J.', 'अनन्या यादव', 'ਗੁਰਪ੍ਰੀਤ']) {
      expect(check(personName, name)).toBeNull();
    }
    for (const name of ['R2D2', '<script>', '-Ram', 'Ram\nSingh', 'a@b']) {
      expect(check(personName, name)).not.toBeNull();
    }
  });

  it('plainText rejects control characters', () => {
    expect(check(plainText, 'Needs help\nwith counting')).toBeNull();
    expect(check(plainText, 'bad\u0000')).not.toBeNull();
  });

  it('strongPassword needs 8+ characters with a letter and a digit', () => {
    expect(check(strongPassword, 'abc12345')).toBeNull();
    expect(check(strongPassword, 'abcdefgh')).not.toBeNull();
    expect(check(strongPassword, '12345678')).not.toBeNull();
    expect(check(strongPassword, 'ab12')).not.toBeNull();
  });

  it('pastIsoDate rejects invalid and future dates', () => {
    const validator = pastIsoDate(() => '2026-10-06');
    expect(check(validator, '2026-10-06')).toBeNull();
    expect(check(validator, '2026-10-07')).toHaveProperty('dateInFuture');
    expect(check(validator, '2026-02-30')).toHaveProperty('isoDate');
    expect(check(validator, '')).toBeNull();
  });

  it('ageInRange checks whole years from the date of birth', () => {
    const validator = ageInRange(2, 7, () => '2026-10-06');
    expect(check(validator, '2022-10-06')).toBeNull(); // exactly 4
    expect(check(validator, '2024-10-07')).toHaveProperty('ageRange'); // just under 2
    expect(check(validator, '2019-10-06')).toHaveProperty('ageRange'); // 7
  });

  it('decimalInRange checks the format and range', () => {
    const validator = decimalInRange(40, 150, 1);
    expect(check(validator, '96.5')).toBeNull();
    expect(check(validator, 96)).toBeNull();
    expect(check(validator, '96.55')).toHaveProperty('decimal');
    expect(check(validator, '-5')).toHaveProperty('decimal');
    expect(check(validator, '12')).toHaveProperty('range');
    expect(check(validator, 'abc')).toHaveProperty('decimal');
  });
});
