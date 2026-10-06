import { hasControlCharacters } from './text';

describe('hasControlCharacters', () => {
  it('allows ordinary text in any script, tabs and line breaks', () => {
    expect(hasControlCharacters('Aarav Kumar')).toBe(false);
    expect(hasControlCharacters('अनन्या यादव')).toBe(false);
    expect(hasControlCharacters('line one\nline two\ttabbed\r\n')).toBe(false);
  });

  it('finds control characters', () => {
    expect(hasControlCharacters('a\u0000b')).toBe(true);
    expect(hasControlCharacters('bell\u0007')).toBe(true);
    expect(hasControlCharacters('del\u007f')).toBe(true);
  });
});
