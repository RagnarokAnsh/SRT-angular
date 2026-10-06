/** Accepts either a bare array or a `{ data: [...] }` wrapper; anything else is an empty list. */
export function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[];
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown }).data)) {
    return (body as { data: T[] }).data;
  }
  return [];
}

/** Accepts an object or a `{ data: {...} }` wrapper. */
export function unwrapItem<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in body) {
    const data = (body as { data?: unknown }).data;
    if (data && typeof data === 'object' && !Array.isArray(data)) return data as T;
  }
  return body as T;
}

/** "101.5", 101.5 -> 101.5; "", null, "abc" -> null. */
export function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  return Number.isFinite(n) ? n : null;
}

/** Project/sector lists may arrive as strings or as objects; normalise to strings. */
export function toNameList(body: unknown, keys: string[]): string[] {
  const names = unwrapList<unknown>(body).map((item) => {
    if (typeof item === 'string') return item.trim();
    if (item && typeof item === 'object') {
      for (const key of keys) {
        const value = (item as Record<string, unknown>)[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }
    return '';
  });
  return [...new Set(names.filter((name) => name.length > 0))];
}
