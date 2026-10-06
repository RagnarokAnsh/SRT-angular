/** The four readiness levels, in order. */
export const LEVELS = ['beginning', 'progressing', 'advancing', 'schoolReady'] as const;
export type Level = (typeof LEVELS)[number];

/**
 * The value stored by the API for each level. These English labels are what the backend
 * already holds, so they stay the wire format; translated labels are display-only.
 */
export const LEVEL_API_VALUE: Record<Level, string> = {
  beginning: 'Beginning',
  progressing: 'Progressing',
  advancing: 'Advancing',
  schoolReady: 'School Ready',
};

const ALIASES: Record<string, Level> = {
  beginning: 'beginning',
  beginner: 'beginning',
  '1': 'beginning',
  progressing: 'progressing',
  '2': 'progressing',
  advancing: 'advancing',
  advanced: 'advancing',
  '3': 'advancing',
  'school ready': 'schoolReady',
  'school-ready': 'schoolReady',
  schoolready: 'schoolReady',
  psr: 'schoolReady',
  'primary school ready': 'schoolReady',
  '4': 'schoolReady',
};

/** Reads any spelling the backend has stored over time ("Beginner", "PSR", "3", ...). */
export function parseLevel(value: unknown): Level | null {
  if (value === null || value === undefined) return null;
  const key = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return ALIASES[key] ?? null;
}
