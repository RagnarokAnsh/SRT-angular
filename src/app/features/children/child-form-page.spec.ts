import { type Child, type ChildInput, toChildGender } from '@core/models/child';

import { isSameChild } from './child-form-page';

const child = (name: string, dateOfBirth: string | null): Child => ({
  id: 1,
  name,
  dateOfBirth,
  symbol: '',
  heightCm: null,
  weightKg: null,
  language: '',
  anganwadiId: 1,
  centerName: null,
  gender: 'Boy',
  awwId: null,
});

const input = (name: string, dateOfBirth: string): ChildInput => ({
  name,
  dateOfBirth,
  gender: 'Boy',
  symbol: 'Sun',
  language: 'Hindi',
  heightCm: 100,
  weightKg: 15,
  anganwadiId: 1,
});

describe('isSameChild', () => {
  it('matches the same name (ignoring case and spaces) and date of birth', () => {
    expect(
      isSameChild(child('Aarav  Kumar', '2021-03-14'), input(' aarav kumar', '2021-03-14')),
    ).toBe(true);
  });

  it('does not match a different date of birth or name', () => {
    expect(
      isSameChild(child('Aarav Kumar', '2021-03-15'), input('Aarav Kumar', '2021-03-14')),
    ).toBe(false);
    expect(isSameChild(child('Aarav', '2021-03-14'), input('Aarav Kumar', '2021-03-14'))).toBe(
      false,
    );
    expect(isSameChild(child('Aarav Kumar', null), input('Aarav Kumar', '2021-03-14'))).toBe(false);
  });

  it('matches a Hindi name typed with a different keyboard', () => {
    // ज़ as one character, or as ज + nukta.
    expect(
      isSameChild(child('\u095Bोया', '2021-03-14'), input('\u091C\u093Cोया', '2021-03-14')),
    ).toBe(true);
  });
});

describe('toChildGender', () => {
  it('reads the values older records hold', () => {
    expect(toChildGender('boy')).toBe('Boy');
    expect(toChildGender(' Male ')).toBe('Boy');
    expect(toChildGender('F')).toBe('Girl');
    expect(toChildGender('girl')).toBe('Girl');
    expect(toChildGender('n/a')).toBe('N/A');
    expect(toChildGender('unknown')).toBeNull();
  });
});
