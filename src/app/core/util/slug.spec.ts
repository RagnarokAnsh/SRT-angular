import { slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Classification', 'classification'],
    ['Emergent Reading & Book Handling', 'emergent-reading--book-handling'],
    ['Emotional Expression and Regulation', 'emotional-expression-and-regulation'],
    ['Vocabulary and Expression', 'vocabulary-and-expression'],
    ['  Number Concept ', 'number-concept'],
    ['Language & Literacy Development', 'language--literacy-development'],
  ])('%s -> %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});
