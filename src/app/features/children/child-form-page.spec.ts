import type { Child, ChildInput } from '@core/models/child';

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
});
