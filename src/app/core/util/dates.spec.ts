import {
  addYears,
  ageOn,
  formatAgeCompact,
  formatIsoDate,
  isValidIsoDate,
  isoToLocalDate,
  normalizeIsoDate,
  parseAgeCompact,
  timestampToIsoDate,
  toIsoDate,
} from './dates';

describe('dates', () => {
  describe('toIsoDate', () => {
    it('uses the local calendar day, not the UTC day', () => {
      // Local midnight is what the datepicker produces. In India this is 18:30 UTC on
      // the previous day, which is how toISOString() used to save every DOB a day early.
      const picked = new Date(2020, 4, 10);
      expect(toIsoDate(picked)).toBe('2020-05-10');
    });

    it('keeps the local day just after midnight', () => {
      expect(toIsoDate(new Date(2026, 9, 6, 0, 30))).toBe('2026-10-06');
    });

    it('zero-pads month and day', () => {
      expect(toIsoDate(new Date(2021, 0, 5))).toBe('2021-01-05');
    });
  });

  describe('isoToLocalDate', () => {
    it('round-trips with toIsoDate', () => {
      const date = isoToLocalDate('2020-02-29');
      expect(date).not.toBeNull();
      expect(toIsoDate(date!)).toBe('2020-02-29');
    });

    it('rejects impossible dates', () => {
      expect(isoToLocalDate('2021-02-29')).toBeNull();
      expect(isoToLocalDate('2021-13-01')).toBeNull();
      expect(isoToLocalDate('not a date')).toBeNull();
    });
  });

  describe('normalizeIsoDate', () => {
    it('accepts plain dates and takes the date part of timestamps', () => {
      expect(normalizeIsoDate('2020-05-10')).toBe('2020-05-10');
      expect(normalizeIsoDate('2020-05-10T00:00:00.000000Z')).toBe('2020-05-10');
      expect(normalizeIsoDate(' 2020-05-10 ')).toBe('2020-05-10');
    });

    it('returns null for anything else', () => {
      expect(normalizeIsoDate(null)).toBeNull();
      expect(normalizeIsoDate(20200510)).toBeNull();
      expect(normalizeIsoDate('10/05/2020')).toBeNull();
      expect(normalizeIsoDate('2020-02-30')).toBeNull();
    });
  });

  describe('timestampToIsoDate', () => {
    it('converts zoned timestamps to the local day', () => {
      const instant = '2026-07-10T22:30:00.000000Z';
      expect(timestampToIsoDate(instant)).toBe(toIsoDate(new Date(instant)));
    });

    it('takes date-only and unzoned values at face value', () => {
      expect(timestampToIsoDate('2026-07-10')).toBe('2026-07-10');
      expect(timestampToIsoDate('2026-07-10 10:00:00')).toBe('2026-07-10');
    });

    it('returns null for garbage', () => {
      expect(timestampToIsoDate('-')).toBeNull();
      expect(timestampToIsoDate(undefined)).toBeNull();
    });
  });

  it('isValidIsoDate only accepts real YYYY-MM-DD strings', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('2024-2-9')).toBe(false);
    expect(isValidIsoDate(new Date())).toBe(false);
  });

  describe('addYears', () => {
    it('shifts by whole years', () => {
      expect(addYears('2026-10-06', -2)).toBe('2024-10-06');
    });

    it('moves 29 February to 28 February in non-leap years', () => {
      expect(addYears('2024-02-29', 1)).toBe('2025-02-28');
    });
  });

  describe('ageOn', () => {
    it('counts completed years and months', () => {
      expect(ageOn('2021-03-14', '2026-10-06')).toEqual({ years: 5, months: 6 });
    });

    it('does not count a month until its day is reached', () => {
      expect(ageOn('2021-03-14', '2026-04-13')).toEqual({ years: 5, months: 0 });
      expect(ageOn('2021-03-14', '2026-04-14')).toEqual({ years: 5, months: 1 });
    });

    it('handles the day before a birthday', () => {
      expect(ageOn('2020-10-07', '2026-10-06')).toEqual({ years: 5, months: 11 });
    });

    it('returns null before birth and for invalid input', () => {
      expect(ageOn('2026-10-07', '2026-10-06')).toBeNull();
      expect(ageOn('garbage', '2026-10-06')).toBeNull();
    });
  });

  describe('compact age', () => {
    it('formats in the API form', () => {
      expect(formatAgeCompact({ years: 5, months: 2 })).toBe('5y 2m');
    });

    it('parses the API form', () => {
      expect(parseAgeCompact('5y 2m')).toEqual({ years: 5, months: 2 });
      expect(parseAgeCompact(' 4Y 11M ')).toEqual({ years: 4, months: 11 });
      expect(parseAgeCompact('five')).toBeNull();
    });
  });

  describe('formatIsoDate', () => {
    it('formats without shifting the day', () => {
      expect(formatIsoDate('2020-05-10', 'en-IN', 'short')).toBe('10/05/2020');
      expect(formatIsoDate('2020-05-10', 'en-IN', 'medium')).toBe('10 May 2020');
    });

    it('formats in Hindi', () => {
      expect(formatIsoDate('2020-05-10', 'hi-IN', 'medium')).toContain('मई');
    });

    it('returns the input when it is not an ISO date', () => {
      expect(formatIsoDate('-', 'en-IN')).toBe('-');
    });
  });
});
