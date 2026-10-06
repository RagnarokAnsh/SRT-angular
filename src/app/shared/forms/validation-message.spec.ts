import { validationMessage } from './validation-message-pipe';

describe('validationMessage', () => {
  it('maps built-in validators to translation keys with parameters', () => {
    expect(validationMessage({ required: true })).toEqual({ key: 'validation.required' });
    expect(validationMessage({ maxlength: { requiredLength: 50, actualLength: 60 } })).toEqual({
      key: 'validation.maxLength',
      params: { max: 50 },
    });
  });

  it('uses the key returned by custom validators', () => {
    expect(
      validationMessage({ ageRange: { key: 'validation.ageRange', params: { min: 2 } } }),
    ).toEqual({
      key: 'validation.ageRange',
      params: { min: 2 },
    });
  });

  it('keeps the plural count of custom validators', () => {
    expect(validationMessage({ decimal: { key: 'validation.decimal', count: 2 } })).toEqual({
      key: 'validation.decimal',
      count: 2,
    });
  });

  it('shows server messages as they are', () => {
    expect(validationMessage({ server: 'The email has already been taken.' })).toEqual({
      text: 'The email has already been taken.',
    });
  });

  it('falls back to a generic message', () => {
    expect(validationMessage({ somethingNew: true })).toEqual({ key: 'validation.invalid' });
    expect(validationMessage(null)).toBeNull();
  });
});
