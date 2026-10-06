import type { ApiUser } from '@core/models/user';

function base64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** An unsigned JWT with the given claims (the app never verifies signatures). */
export function fakeJwt(claims: Record<string, unknown>): string {
  return `${base64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }))}.${base64Url(JSON.stringify(claims))}.sig`;
}

/** A token valid for the next hour (or `seconds`). */
export function validToken(seconds = 3600, now = Date.now()): string {
  return fakeJwt({ sub: 1, exp: Math.floor(now / 1000) + seconds });
}

export function testUser(roles: string[] = ['aww'], extra: Partial<ApiUser> = {}): ApiUser {
  return {
    id: 7,
    name: 'Sunita Devi',
    email: 'sunita@example.org',
    roles: roles.map((name, i) => ({ id: i + 1, name })),
    anganwadi_id: 3,
    ...extra,
  };
}
