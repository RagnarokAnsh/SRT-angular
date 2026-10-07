import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('accepts in-app paths', () => {
    expect(safeReturnUrl('/students')).toBe('/students');
    expect(safeReturnUrl(' /competencies/4?tab=2#top ')).toBe('/competencies/4?tab=2#top');
  });

  it.each([
    ['protocol-relative URL', '//evil.example'],
    ['backslash trick', '/\\evil.example'],
    ['backslash inside', '/a\\b'],
    ['absolute URL', 'https://evil.example'],
    ['javascript URL', 'javascript:alert(1)'],
    ['relative path', 'students'],
    ['login page', '/login'],
    ['login with query', '/login?returnUrl=/x'],
    ['line break', '/a\nb'],
    ['tab', '/a\tb'],
    ['control character', '/a\u0000b'],
  ])('rejects a %s', (_label, value) => {
    expect(safeReturnUrl(value)).toBeNull();
  });

  it('rejects non-strings', () => {
    expect(safeReturnUrl(undefined)).toBeNull();
    expect(safeReturnUrl(['/students'])).toBeNull();
  });
});
