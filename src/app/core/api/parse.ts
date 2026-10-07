/** The API answered 2xx with something other than what the request returns. */
export class UnexpectedResponseError extends Error {
  constructor() {
    super('The server sent an unexpected response.');
    this.name = 'UnexpectedResponseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** A 2xx answer that says the request failed (`{ status: false, message }`). */
function reportsFailure(body: unknown): boolean {
  return isRecord(body) && (body['status'] === false || body['success'] === false);
}

/** How PHP encodes an array with gaps: `{ "0": {...}, "3": {...} }`. */
function indexedValues(body: Record<string, unknown>): unknown[] | null {
  const keys = Object.keys(body);
  if (!keys.every((key) => /^\d+$/.test(key))) return null;
  return keys.sort((a, b) => Number(a) - Number(b)).map((key) => body[key]);
}

/**
 * A list from the API: a bare array, a `{ data: [...] }` wrapper or an object keyed 0, 1, 2…
 * An empty answer is an empty list. Anything else (a failure reported with status 200, an
 * unknown shape) throws, so the page shows an error instead of an empty list.
 */
export function unwrapList<T>(body: unknown): T[] {
  if (body === null || body === undefined || body === '') return [];
  if (Array.isArray(body)) return body as T[];
  if (isRecord(body) && !reportsFailure(body)) {
    const data = body['data'];
    if (Array.isArray(data)) return data as T[];
    if (data === null) return [];
    const values = indexedValues(isRecord(data) ? data : body);
    if (values) return values as T[];
  }
  throw new UnexpectedResponseError();
}

/** One object from the API, bare or in a `{ data: {...} }` wrapper. Anything else throws. */
export function unwrapItem<T>(body: unknown): T {
  if (!isRecord(body) || reportsFailure(body)) throw new UnexpectedResponseError();
  const data = body['data'];
  return (isRecord(data) ? data : body) as T;
}

/**
 * For saves and deletes, whose answer is not used: only checks that it doesn't report a
 * failure. An empty answer is fine.
 */
export function expectSuccess(body: unknown): void {
  if (reportsFailure(body)) throw new UnexpectedResponseError();
}

/** "101.5", " 101.5 ", 101.5 -> 101.5; "", "  ", null, "abc", true -> null. */
export function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || !value.trim()) return null;
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

/** A record id (a positive whole number, some PHP setups send it as a string), or null. */
export function toId(value: unknown): number | null {
  const n = toNumberOrNull(value);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

/** A height or weight: the old app stored 0 when nothing was entered, so 0 means none. */
export function toMeasure(value: unknown): number | null {
  const n = toNumberOrNull(value);
  return n !== null && n > 0 ? n : null;
}

/** Text from the API, trimmed; numbers are accepted, anything else is ''. */
export function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

/** Project/sector lists may arrive as strings or as objects; normalise to strings. */
export function toNameList(body: unknown, keys: string[]): string[] {
  const names = unwrapList<unknown>(body).map((item) => {
    if (typeof item === 'string') return item.trim();
    if (isRecord(item)) {
      for (const key of keys) {
        const value = text(item[key]);
        if (value) return value;
      }
    }
    return '';
  });
  return [...new Set(names.filter((name) => name.length > 0))];
}
