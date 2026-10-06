/**
 * The school readiness framework: six domains and their competencies, keyed by the slug of
 * the name the API uses. Used where no API data is available (the public home page) and to
 * look up translations and colours for API data.
 */
export interface FrameworkDomain {
  slug: string;
  /** Fill for the domain (white text on it passes WCAG AA). */
  color: string;
  /** Lighter tint for its competencies (dark text on it passes WCAG AA). */
  tint: string;
  competencies: readonly string[];
}

export const FRAMEWORK: readonly FrameworkDomain[] = [
  {
    slug: 'cognitive-development',
    color: '#df2e1b',
    tint: '#f4aea7',
    competencies: ['classification', 'patterns', 'number-concept', 'seriation'],
  },
  {
    slug: 'language--literacy-development',
    color: '#277ab1',
    tint: '#9fc6e0',
    competencies: [
      'vocabulary-and-expression',
      'listening-comprehension',
      'emergent-reading--book-handling',
      'emergent-writing',
    ],
  },
  {
    slug: 'physical--motor-development',
    color: '#1e864a',
    tint: '#9edbb7',
    competencies: ['gross-motor-development', 'fine-motor-development'],
  },
  {
    slug: 'socio-emotional-development',
    color: '#a36708',
    tint: '#fad294',
    competencies: ['interaction', 'sharing-with-others', 'emotional-expression-and-regulation'],
  },
  {
    slug: 'approaches-towards-learning',
    color: '#8e44ad',
    tint: '#ccabda',
    competencies: ['initiative', 'task-persistence'],
  },
  {
    slug: 'creativity-development',
    color: '#12836d',
    tint: '#96d4c8',
    competencies: ['creative-expression', 'imagination'],
  },
];

export const FRAMEWORK_COMPETENCY_COUNT = FRAMEWORK.reduce(
  (sum, domain) => sum + domain.competencies.length,
  0,
);

/** Colours for a domain, by slug; unknown domains get a neutral pair. */
export function domainColors(slug: string): { color: string; tint: string } {
  const domain = FRAMEWORK.find((d) => d.slug === slug);
  return domain
    ? { color: domain.color, tint: domain.tint }
    : { color: '#5f6672', tint: '#e5e7eb' };
}
