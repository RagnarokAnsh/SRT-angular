/**
 * Calendar dates travel through the app as `YYYY-MM-DD` strings, never as `Date` objects.
 * `Date#toISOString()` converts to UTC first, which moved every picked date of birth one
 * day back for users in India (UTC+5:30). Everything here works on local calendar parts.
 */
export type IsoDate = string;

export interface Age {
  years: number;
  months: number;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_PREFIX = /^(\d{4})-(\d{2})-(\d{2})/;
const HAS_TIME_ZONE = /T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function isRealDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

/** The local calendar date of `date` (default: now) as `YYYY-MM-DD`. */
export function toIsoDate(date: Date = new Date()): IsoDate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** A local-midnight `Date` for an ISO date, for UI widgets such as the datepicker. */
export function isoToLocalDate(iso: IsoDate): Date | null {
  const m = DATE_ONLY.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return isRealDate(y, mo, d) ? new Date(y, mo - 1, d) : null;
}

/**
 * Normalises a calendar-date value from the API (`2020-05-10` or
 * `2020-05-10T00:00:00.000000Z`) by taking its date part. Use for dates of birth,
 * which must never be shifted by a time zone.
 */
export function normalizeIsoDate(value: unknown): IsoDate | null {
  if (typeof value !== 'string') return null;
  const m = DATE_PREFIX.exec(value.trim());
  if (!m) return null;
  return isRealDate(Number(m[1]), Number(m[2]), Number(m[3])) ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/**
 * The local calendar date of an API timestamp such as `created_at`. Timestamps with a
 * time zone (`...Z`, `...+05:30`) are converted to the user's local day; values without
 * one are taken at face value.
 */
export function timestampToIsoDate(value: unknown): IsoDate | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (HAS_TIME_ZONE.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : toIsoDate(parsed);
  }
  return normalizeIsoDate(trimmed);
}

export function isValidIsoDate(value: unknown): value is IsoDate {
  return typeof value === 'string' && DATE_ONLY.test(value) && normalizeIsoDate(value) === value;
}

/** `iso` shifted by whole years (29 Feb falls back to 28 Feb). */
export function addYears(iso: IsoDate, years: number): IsoDate {
  const date = isoToLocalDate(iso);
  if (!date) return iso;
  const targetYear = date.getFullYear() + years;
  const month = date.getMonth();
  const lastDay = new Date(targetYear, month + 1, 0).getDate();
  return toIsoDate(new Date(targetYear, month, Math.min(date.getDate(), lastDay)));
}

/** Age in completed years and months on a given day, or null if `on` is before birth. */
export function ageOn(dateOfBirth: IsoDate, on: IsoDate): Age | null {
  const birth = DATE_ONLY.exec(dateOfBirth);
  const day = DATE_ONLY.exec(on);
  if (!birth || !day) return null;
  let years = Number(day[1]) - Number(birth[1]);
  let months = Number(day[2]) - Number(birth[2]);
  if (Number(day[3]) < Number(birth[3])) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return years < 0 ? null : { years, months };
}

/** Age in the compact `5y 2m` form the API stores with each assessment. */
export function formatAgeCompact(age: Age): string {
  return `${age.years}y ${age.months}m`;
}

/** Parses the API's `5y 2m` form. */
export function parseAgeCompact(value: unknown): Age | null {
  if (typeof value !== 'string') return null;
  const m = /^\s*(\d+)\s*y\s*(\d+)\s*m\s*$/i.exec(value);
  return m ? { years: Number(m[1]), months: Number(m[2]) } : null;
}

/** Formats an ISO date for display in the given locale, without any time-zone shift. */
export function formatIsoDate(
  iso: IsoDate,
  locale: string,
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  const m = DATE_ONLY.exec(iso);
  if (!m) return iso;
  const utc = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }
      : {
          day: 'numeric',
          month: style === 'long' ? 'long' : 'short',
          year: 'numeric',
          timeZone: 'UTC',
        };
  return new Intl.DateTimeFormat(locale, options).format(utc);
}
