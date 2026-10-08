import { domainSlug, slugify } from './slug';

describe('slugify', () => {
  it.each([
    ['Classification', 'classification'],
    ['Emergent Reading & Book Handling', 'emergent-reading--book-handling'],
    ['Emotional Expression and Regulation', 'emotional-expression-and-regulation'],
    ['Vocabulary and Expression', 'vocabulary-and-expression'],
    ['  Number Concept ', 'number-concept'],
    ['Emergent reading \u2013 book handling', 'emergent-reading--book-handling'],
  ])('%s -> %s', (name, slug) => {
    expect(slugify(name)).toBe(slug);
  });
});

describe('domainSlug', () => {
  it.each([
    ['Language and Literacy Development', 'language-and-literacy-development'],
    ['Language & Literacy Development', 'language-and-literacy-development'],
    ['Physical and Motor Development', 'physical-and-motor-development'],
    ['Socio-Emotional Development', 'socio-emotional-development'],
  ])('%s -> %s', (name, slug) => {
    expect(domainSlug(name)).toBe(slug);
  });
});
