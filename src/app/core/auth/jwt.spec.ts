import { fakeJwt } from '../../../testing/auth';
import { clockSkewMs, isTokenUsable, jwtClaims, jwtExpiry } from './jwt';

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

  it('reads the iat claim too', () => {
    expect(jwtClaims(fakeJwt({ iat: 1_700_000_000, exp: 1_700_003_600 }))).toEqual({
      iat: 1_700_000_000,
      exp: 1_700_003_600,
    });
    expect(jwtClaims('nope')).toEqual({ iat: null, exp: null });
  });

  it("measures how far the server's clock is from the phone's", () => {
    const server = 1_700_000_000_000;
    const token = fakeJwt({ iat: server / 1000, exp: server / 1000 + 3600 });
    expect(clockSkewMs(token, server - 7_200_000)).toBe(7_200_000);
    expect(clockSkewMs(token, server + 10_800_000)).toBe(-10_800_000);
    expect(clockSkewMs(fakeJwt({ exp: server / 1000 }), server)).toBe(0);
    // An iat in milliseconds is a server quirk, not a phone 50 000 years off.
    expect(clockSkewMs(fakeJwt({ iat: server, exp: server }), server)).toBe(0);
  });

  it("judges expiry by the server's clock when the phone's is wrong", () => {
    const server = 1_700_000_000_000;
    const token = fakeJwt({ iat: server / 1000, exp: server / 1000 + 3600 });
    // The phone is 3 hours fast: the token looks expired by its clock alone.
    const phone = server + 10_800_000;
    expect(isTokenUsable(token, phone)).toBe(false);
    expect(isTokenUsable(token, phone, clockSkewMs(token, phone))).toBe(true);
    // The phone is 2 hours slow: an expired token must not look valid.
    const later = server + 3_700_000;
    const slow = later - 7_200_000;
    expect(isTokenUsable(token, slow)).toBe(true);
    expect(isTokenUsable(token, slow, 7_200_000)).toBe(false);
  });
});
