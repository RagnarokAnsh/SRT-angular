import { hasControlCharacters, tidyText, toAsciiDigits } from './text';

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

describe('toAsciiDigits', () => {
  it('turns Devanagari digits into ASCII ones and leaves the rest', () => {
    expect(toAsciiDigits('१०२.५')).toBe('102.5');
    expect(toAsciiDigits('98.5 cm')).toBe('98.5 cm');
  });
});

describe('tidyText', () => {
  it('trims, collapses spaces and uses one Unicode form', () => {
    expect(tidyText('  Ram   Kumar ')).toBe('Ram Kumar');
    // ज़ typed as one character or as ज + nukta is the same name.
    expect(tidyText('\u095B')).toBe(tidyText('\u091C\u093C'));
  });
});
