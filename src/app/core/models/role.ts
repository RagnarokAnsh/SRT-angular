/** Role names exactly as the API sends them (compared case-insensitively). */
export const ROLE_NAMES = ['admin', 'stateofficial', 'dpo', 'cdpo', 'supervisor', 'aww'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

export function toRoleName(value: unknown): RoleName | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().toLowerCase();
  return (ROLE_NAMES as readonly string[]).includes(name) ? (name as RoleName) : null;
}
