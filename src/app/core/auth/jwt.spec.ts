import { fakeJwt } from '../../../testing/auth';
import { isTokenUsable, jwtExpiry } from './jwt';

describe('jwt', () => {
  it('reads the exp claim from a base64url payload', () => {
    // "~~~" makes the base64 contain characters that differ in base64url.
    expect(jwtExpiry(fakeJwt({ exp: 2_000_000_000, note: '~~~???' }))).toBe(2_000_000_000);
  });

  it('returns null for malformed tokens or a missing/non-numeric exp', () => {
    expect(jwtExpiry('not-a-token')).toBeNull();
    expect(jwtExpiry('a.%%%.c')).toBeNull();
    expect(jwtExpiry(fakeJwt({ sub: 1 }))).toBeNull();
    expect(jwtExpiry(fakeJwt({ exp: '2000000000' }))).toBeNull();
  });

  it('only accepts tokens that have not expired', () => {
    const now = 1_700_000_000_000;
    expect(isTokenUsable(fakeJwt({ exp: now / 1000 + 60 }), now)).toBe(true);
    expect(isTokenUsable(fakeJwt({ exp: now / 1000 - 1 }), now)).toBe(false);
    expect(isTokenUsable(null, now)).toBe(false);
    expect(isTokenUsable('', now)).toBe(false);
  });
});
