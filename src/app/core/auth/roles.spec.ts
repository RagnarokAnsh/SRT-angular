import { ROLE_HOME, canOpen } from './roles';

describe('canOpen', () => {
  it('lets each role open its own sections only', () => {
    expect(canOpen('/competencies/12', ['aww'])).toBe(true);
    expect(canOpen('/competencies/domain/cognitive-development', ['supervisor'])).toBe(false);
    expect(canOpen('/students?q=ram', ['supervisor'])).toBe(true);
    expect(canOpen('/dashboard', ['cdpo'])).toBe(false);
    expect(canOpen('/admin/users', ['aww', 'admin'])).toBe(true);
    expect(canOpen('/supervisor', ['cdpo'])).toBe(false);
  });

  it('allows pages without a rule, such as the home page', () => {
    expect(canOpen('/home', [])).toBe(true);
    expect(canOpen('/', ['dpo'])).toBe(true);
  });
});

describe('ROLE_HOME', () => {
  it('lands workers on the home page and everyone else on a dashboard', () => {
    expect(ROLE_HOME.aww).toBe('/home');
    for (const role of ['admin', 'stateofficial', 'dpo', 'cdpo', 'supervisor'] as const) {
      expect(ROLE_HOME[role]).not.toBe('/home');
    }
  });
});
