import { FRAMEWORK } from './framework';

const KNOWN = new Set(FRAMEWORK.flatMap((domain) => domain.competencies));

export interface ActivityVideo {
  src: string;
  poster: string;
}

/** True for competencies the app has pictures and translations for. */
export function isKnownCompetency(slug: string): boolean {
  return KNOWN.has(slug);
}

export function competencyImage(slug: string): string | null {
  return KNOWN.has(slug) ? `assets/images/competencies/${slug}.webp` : null;
}

export function competencyThumbnail(slug: string): string | null {
  return KNOWN.has(slug) ? `assets/images/competencies/thumbs/${slug}.webp` : null;
}

/**
 * Suggested activity videos. Every competency currently shares one sample video; add
 * competency-specific files here as they become available.
 */
export function activityVideos(_slug: string): ActivityVideo[] {
  return [{ src: 'assets/videos/option1.mp4', poster: 'assets/videos/option1-poster.webp' }];
}

/** Gross and fine motor assessments also record height and weight (IDs 10 and 11 before). */
export function needsMeasurements(competency: { id: number; slug: string }): boolean {
  return (
    competency.slug === 'gross-motor-development' ||
    competency.slug === 'fine-motor-development' ||
    competency.id === 10 ||
    competency.id === 11
  );
}
