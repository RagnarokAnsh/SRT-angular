import { LEVELS, LEVEL_API_VALUE, parseLevel } from './level';

describe('levels', () => {
  it.each([
    ['Beginning', 'beginning'],
    ['beginner', 'beginning'],
    ['1', 'beginning'],
    ['Progressing', 'progressing'],
    ['Advancing', 'advancing'],
    ['Advanced', 'advancing'],
    ['School Ready', 'schoolReady'],
    ['school  ready', 'schoolReady'],
    ['PSR', 'schoolReady'],
    ['4', 'schoolReady'],
  ])('parses %s', (raw, level) => {
    expect(parseLevel(raw)).toBe(level);
  });

  it('returns null for unknown values', () => {
    expect(parseLevel('Expert')).toBeNull();
    expect(parseLevel(null)).toBeNull();
    expect(parseLevel('-')).toBeNull();
  });

  it('round-trips every level through its API value', () => {
    for (const level of LEVELS) {
      expect(parseLevel(LEVEL_API_VALUE[level])).toBe(level);
    }
  });
});
