/** Reads the `exp` claim (seconds since epoch) of a JWT without verifying it. */
export function jwtExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims: unknown = JSON.parse(atob(padded));
    const exp = (claims as { exp?: unknown } | null)?.exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp : null;
  } catch {
    return null;
  }
}

/** True when the token is a JWT whose `exp` is still in the future. */
export function isTokenUsable(token: string | null | undefined, nowMs = Date.now()): boolean {
  if (!token) return false;
  const exp = jwtExpiry(token);
  return exp !== null && exp * 1000 > nowMs;
}
