import type { Standing } from '../dashboard-model';

/**
 * How each standing looks. Bars use the strong chart colours (numbers inside them use the ink
 * that reads at 4.5:1 or better); names and grid cells use the soft level tints with dark
 * text. The number (1–4) is the second cue, so colour is never the only one, and it reads the
 * same in every language.
 */
export const STANDING_COLOR: Record<Standing, string> = {
  beginning: 'var(--chart-level-beginning)',
  progressing: 'var(--chart-level-progressing)',
  advancing: 'var(--chart-level-advancing)',
  schoolReady: 'var(--chart-level-schoolReady)',
  other: 'var(--chart-other)',
  none: 'var(--chart-none)',
};

export const STANDING_TINT: Record<Standing, string> = {
  beginning: 'var(--level-beginning-soft)',
  progressing: 'var(--level-progressing-soft)',
  advancing: 'var(--level-advancing-soft)',
  schoolReady: 'var(--level-schoolReady-soft)',
  other: '#e7e5e4',
  none: 'var(--color-surface-sunken)',
};

/** Text on the strong colour: dark where white would be too faint. */
export const STANDING_INK: Record<Standing, string> = {
  beginning: 'var(--level-text)',
  progressing: '#fff',
  advancing: '#fff',
  schoolReady: '#fff',
  other: 'var(--level-text)',
  none: 'var(--level-text)',
};

export const STANDING_MARK: Record<Standing, string> = {
  beginning: '1',
  progressing: '2',
  advancing: '3',
  schoolReady: '4',
  other: '?',
  none: '–',
};

export function standingLabelKey(standing: Standing): string {
  if (standing === 'other') return 'dashboard.otherResult';
  if (standing === 'none') return 'dashboard.notAssessed';
  return `levels.${standing}.label`;
}
