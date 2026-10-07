interface Claims {
  /** Expiry, seconds since epoch. */
  exp: number | null;
  /** Issued at, seconds since epoch (by the server's clock). */
  iat: number | null;
}

/** Reads the `exp` and `iat` claims of a JWT without verifying it. */
export function jwtClaims(token: string): Claims {
  const none = { exp: null, iat: null };
  const payload = token.split('.')[1];
  if (!payload) return none;
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const claims = JSON.parse(atob(padded)) as Record<string, unknown> | null;
    const read = (value: unknown) =>
      typeof value === 'number' && Number.isFinite(value) ? value : null;
    return { exp: read(claims?.['exp']), iat: read(claims?.['iat']) };
  } catch {
    return none;
  }
}

/** Reads the `exp` claim (seconds since epoch) of a JWT without verifying it. */
export function jwtExpiry(token: string): number | null {
  return jwtClaims(token).exp;
}

/** Beyond this, `iat` is more likely in the wrong unit than the phone's clock that wrong. */
const MAX_SKEW_MS = 366 * 24 * 3600 * 1000;

/**
 * How far the server's clock is ahead of this device's (ms), from a token just received:
 * phones in the field often have the wrong time, which would otherwise make valid tokens
 * look expired (or expired ones valid). 0 when the token has no usable `iat`.
 */
export function clockSkewMs(token: string, nowMs = Date.now()): number {
  const { iat } = jwtClaims(token);
  const skew = iat === null ? 0 : iat * 1000 - nowMs;
  return Math.abs(skew) > MAX_SKEW_MS ? 0 : skew;
}

/** True when the token is a JWT whose `exp` is still in the future (by the server's clock). */
export function isTokenUsable(
  token: string | null | undefined,
  nowMs = Date.now(),
  skewMs = 0,
): boolean {
  if (!token) return false;
  const exp = jwtExpiry(token);
  return exp !== null && exp * 1000 > nowMs + skewMs;
}
