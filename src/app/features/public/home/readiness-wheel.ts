import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import { FRAMEWORK, FRAMEWORK_COMPETENCY_COUNT } from '@core/catalog/framework';
import { LanguageService } from '@core/i18n/language';
import { PluralPipe } from '@shared/pipes/plural-pipe';
import { scrollToElement } from '@shared/scroll';
import { TextMeasurer } from '@shared/text-measurer';

import {
  type Point,
  arcLength,
  fitFontSize,
  isLowerHalf,
  labelLines,
  placeBox,
  polar,
  radialRotation,
  ringSegmentPath,
  textArcPath,
} from './wheel-geometry';

type Layout = 'compact' | 'full';

interface LayoutSpec {
  hub: number;
  domainRing: readonly [number, number];
  /** null: no competency ring (competencies are named in the panel instead). */
  competencyRing: readonly [number, number] | null;
  hubFont: number;
  /** `flat`: upright labels inside each segment, easiest to read; `curved`: along the ring. */
  domainLabels: 'flat' | 'curved';
  domainFont: number;
  domainMinFont: number;
  /** 0: no labels on the competency ring (too narrow to read). */
  competencyFont: number;
  competencyMinFont: number;
}

const SIZE = 500;
const CENTER = SIZE / 2;
/** Below this rendered width, competency names move out of the wheel into the panel. */
const FULL_LAYOUT_MIN_PX = 470;

const LAYOUTS: Record<Layout, LayoutSpec> = {
  // Phones: the domain ring fills the wheel and its labels stay upright and large;
  // competencies are named in the panel when a domain is chosen.
  compact: {
    hub: 74,
    domainRing: [79, 246],
    competencyRing: null,
    hubFont: 27,
    domainLabels: 'flat',
    domainFont: 34,
    domainMinFont: 18,
    competencyFont: 0,
    competencyMinFont: 0,
  },
  // Wider screens: domains in an inner ring, every competency named on the outer ring.
  full: {
    hub: 56,
    domainRing: [62, 138],
    competencyRing: [144, 240],
    hubFont: 18,
    domainLabels: 'curved',
    domainFont: 17,
    domainMinFont: 12,
    competencyFont: 13.5,
    competencyMinFont: 10,
  },
};

const DOMAIN_SPAN = 360 / FRAMEWORK.length;
const ARC_PADDING_DEG = 2;
const RADIAL_PADDING = 8;
/** Space between a flat label and the edges of its segment. */
const FLAT_PADDING = 7;
/** Canvas and SVG text widths can differ slightly; leave a little room. */
const WIDTH_SAFETY = 1.04;

interface TextLine {
  text: string;
  y: number;
}

interface DomainLabel {
  id: string;
  arc: string;
  text: string;
}

interface CompetencyView {
  slug: string;
  name: string;
  /** null when the layout has no competency ring. */
  path: string | null;
  label: { transform: string; lines: TextLine[] } | null;
}

interface DomainView {
  index: number;
  slug: string;
  name: string;
  color: string;
  tint: string;
  path: string;
  /** Curved labels (one text path per line). */
  labels: DomainLabel[];
  /** Upright label lines, centred on `x`. */
  flat: { x: number; lines: TextLine[] } | null;
  competencies: CompetencyView[];
}

interface FlatBlock {
  lines: string[];
  /** Per unit of font size. */
  width: number;
  ascent: number;
  descent: number;
}

let nextId = 0;

/**
 * The school readiness framework as a wheel: six domains around the centre, their
 * competencies on the outer ring. Tapping a domain (or using the list beside the wheel)
 * shows its competencies. Labels are sized to fit their segment in every language.
 */
@Component({
  selector: 'app-readiness-wheel',
  imports: [MatButtonModule, MatIconModule, TranslocoPipe, PluralPipe],
  templateUrl: './readiness-wheel.html',
  styleUrl: './readiness-wheel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReadinessWheel {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly measurer = inject(TextMeasurer);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly idPrefix = `wheel-${nextId++}`;

  private readonly wheel = viewChild.required<ElementRef<HTMLElement>>('wheel');
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly panelTitle = viewChild<ElementRef<HTMLElement>>('panelTitle');
  private readonly domainButtons = viewChildren<ElementRef<HTMLButtonElement>>('domainButton');

  protected readonly size = SIZE;
  protected readonly center = CENTER;
  /**
   * A first guess from the window width (the wheel is at least 482 px wide on any screen of
   * 600 px or more), so desktops don't flash the phone layout before the wheel is measured.
   */
  protected readonly layout = signal<Layout>(
    (this.document.defaultView?.innerWidth ?? 0) >= 600 ? 'full' : 'compact',
  );
  protected readonly selected = signal<number | null>(null);
  /** Read out by screen readers when Previous / Next changes the domain. */
  protected readonly announcement = signal('');
  /** Bumped when web fonts finish loading, so labels are re-measured with the real font. */
  private readonly fontsVersion = signal(0);

  /** `<textPath>` needs the page URL: a bare `#id` would resolve against `<base href>`. */
  protected readonly pageUrl = this.document.location.pathname + this.document.location.search;

  protected readonly spec = computed(() => LAYOUTS[this.layout()]);

  protected readonly model = computed(() => {
    this.language.current();
    this.fontsVersion();
    return this.buildModel(this.spec());
  });

  protected readonly selectedDomain = computed(() => {
    const index = this.selected();
    return index === null ? null : (this.model().domains[index] ?? null);
  });

  protected readonly summary = computed(() => {
    this.language.current();
    return this.transloco.translate('home.wheel.summary', {
      domains: FRAMEWORK.length,
      competencies: FRAMEWORK_COMPETENCY_COUNT,
    });
  });

  constructor() {
    afterNextRender(() => this.observe());
  }

  protected select(index: number | null): void {
    const previous = this.selected();
    this.selected.set(index);
    this.announcement.set('');
    // The panel's content is replaced, so move focus to its new heading (or back to the
    // domain that was open) and bring the panel into view on phones, where it sits below.
    afterNextRender(
      {
        write: () => {
          const target =
            index !== null
              ? this.panelTitle()?.nativeElement
              : previous !== null
                ? this.domainButtons()[previous]?.nativeElement
                : undefined;
          target?.focus({ preventScroll: true });
          scrollToElement(this.panel().nativeElement, 'nearest');
        },
      },
      { injector: this.injector },
    );
  }

  /**
   * Previous / Next: focus stays on the button, so it can be pressed again, and the new
   * domain is announced instead.
   */
  protected step(delta: number): void {
    const current = this.selected() ?? 0;
    const count = FRAMEWORK.length;
    const next = (current + delta + count) % count;
    this.selected.set(next);
    const domain = this.model().domains[next];
    this.announcement.set(
      `${domain.name}. ${this.transloco.translate('home.wheel.domainOf', { current: next + 1, total: count })}`,
    );
  }

  /** Pointer shortcut; keyboard and screen reader users use the domain list instead. */
  protected onWheelClick(event: MouseEvent): void {
    const target = (event.target as Element | null)?.closest('[data-domain]');
    if (!target) return;
    const index = Number(target.getAttribute('data-domain'));
    this.select(this.selected() === index ? null : index);
  }

  private observe(): void {
    const element = this.wheel().nativeElement;
    const destroyRef = this.injector.get(DestroyRef);
    const update = (width: number) =>
      this.layout.set(width >= FULL_LAYOUT_MIN_PX ? 'full' : 'compact');
    update(element.getBoundingClientRect().width);
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(([entry]) => update(entry.contentRect.width));
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    }
    const fonts = this.document.fonts;
    if (fonts) {
      const bump = () => this.fontsVersion.update((v) => v + 1);
      void fonts.ready.then(bump);
      fonts.addEventListener('loadingdone', bump);
      destroyRef.onDestroy(() => fonts.removeEventListener('loadingdone', bump));
    }
  }

  private buildModel(spec: LayoutSpec) {
    const t = (key: string) => this.transloco.translate(key);
    const measure = (text: string, fontSize: number) => this.measurer.measure(text, fontSize);

    // Hub
    const hubLines = labelLines(t('home.wheel.hub'));
    const hubFont = fitFontSize(
      hubLines.map((text) => ({ text, maxWidth: spec.hub * 1.6 })),
      spec.hubFont,
      10,
      (text, size) => this.measurer.measure(text, size, 700),
    );
    const hub = this.stackLines(hubLines, hubFont, CENTER);

    // Domain labels
    const [d1, d2] = spec.domainRing;
    const domainMid = (d1 + d2) / 2;
    const domainLines = FRAMEWORK.map((domain, index) => {
      const mid = index * DOMAIN_SPAN;
      return {
        index,
        mid,
        lower: isLowerHalf(mid),
        lines: labelLines(t(`catalog.domains.${domain.slug}.wheel`)),
      };
    });
    // Curved labels: lines sit on concentric arcs.
    const lineRadii = (lines: number, font: number, lower: boolean): number[] => {
      if (lines < 2) return [domainMid];
      const offset = font * 0.62;
      // Upper half: the first line is outermost; lower half (flipped text): innermost.
      return lower
        ? [domainMid - offset, domainMid + offset]
        : [domainMid + offset, domainMid - offset];
    };
    const flat =
      spec.domainLabels === 'flat'
        ? this.fitFlatLabels(
            domainLines.map(({ lines }) => this.flatBlock(lines)),
            spec,
          )
        : null;
    const usableDeg = DOMAIN_SPAN - 2 * ARC_PADDING_DEG;
    const domainFont = flat
      ? flat.font
      : fitFontSize(
          domainLines.flatMap(({ lines, lower }) => {
            const radii = lineRadii(lines.length, spec.domainFont, lower);
            return lines.map((text, i) => ({
              text,
              maxWidth: arcLength(radii[i], usableDeg) * 0.94,
            }));
          }),
          spec.domainFont,
          spec.domainMinFont,
          measure,
        );

    // Competency labels run along the radius (only when the wheel is wide enough).
    const ring = spec.competencyRing;
    const competencyFont =
      ring && spec.competencyFont
        ? fitFontSize(
            FRAMEWORK.flatMap((domain) =>
              domain.competencies.flatMap((slug) =>
                labelLines(t(`catalog.competencies.${slug}.wheel`)).map((text) => ({
                  text,
                  maxWidth: ring[1] - ring[0] - 2 * RADIAL_PADDING,
                })),
              ),
            ),
            spec.competencyFont,
            spec.competencyMinFont,
            measure,
          )
        : 0;

    const domains: DomainView[] = FRAMEWORK.map((domain, index) => {
      const start = index * DOMAIN_SPAN - DOMAIN_SPAN / 2;
      const end = start + DOMAIN_SPAN;
      const { lower, lines } = domainLines[index];

      let labels: DomainLabel[] = [];
      let flatLabel: DomainView['flat'] = null;
      if (flat) {
        const block = flat.blocks[index];
        const point = flat.points[index] ?? polar(0, 0, domainMid, index * DOMAIN_SPAN);
        flatLabel = {
          x: Math.round((CENTER + point.x) * 100) / 100,
          lines: this.flatLines(block, domainFont, CENTER + point.y),
        };
      } else {
        const radii = lineRadii(lines.length, domainFont, lower);
        labels = lines.map((text, i) => {
          // Centre the glyphs on the line radius (text sits on the outside of the baseline
          // on the upper half, on the inside when flipped on the lower half).
          const baseline = radii[i] + (lower ? 0.35 : -0.35) * domainFont;
          return {
            id: `${this.idPrefix}-d${index}-${i}`,
            arc: textArcPath(
              CENTER,
              CENTER,
              baseline,
              start + ARC_PADDING_DEG,
              end - ARC_PADDING_DEG,
            ),
            text,
          };
        });
      }

      const span = DOMAIN_SPAN / domain.competencies.length;
      const competencies = domain.competencies.map((slug, i) => {
        const a1 = start + i * span;
        const a2 = a1 + span;
        let label: CompetencyView['label'] = null;
        if (ring && competencyFont) {
          const angle = (a1 + a2) / 2;
          const point = polar(CENTER, CENTER, (ring[0] + ring[1]) / 2, angle);
          label = {
            transform: `translate(${point.x} ${point.y}) rotate(${radialRotation(angle)})`,
            lines: this.stackLines(
              labelLines(t(`catalog.competencies.${slug}.wheel`)),
              competencyFont,
              0,
            ),
          };
        }
        return {
          slug,
          name: t(`catalog.competencies.${slug}.name`),
          path: ring ? ringSegmentPath(CENTER, CENTER, ring[0], ring[1], a1, a2) : null,
          label,
        };
      });

      return {
        index,
        slug: domain.slug,
        name: t(`catalog.domains.${domain.slug}.name`),
        color: domain.color,
        tint: domain.tint,
        path: ringSegmentPath(CENTER, CENTER, d1, d2, start, end),
        labels,
        flat: flatLabel,
        competencies,
      };
    });

    return { hub, hubFont, domainFont, competencyFont, domains };
  }

  /** Measures a label's lines once, per unit of font size. */
  private flatBlock(lines: string[]): FlatBlock {
    const base = 100;
    const metrics = lines.map((text) => this.measurer.metrics(text, base));
    return {
      lines,
      width: (Math.max(...metrics.map((m) => m.width)) / base) * WIDTH_SAFETY,
      ascent: Math.max(...metrics.map((m) => m.ascent)) / base,
      descent: Math.max(...metrics.map((m) => m.descent)) / base,
    };
  }

  /** Distance between baselines: taller scripts (Devanagari) get more room. */
  private lineGap(block: FlatBlock, font: number): number {
    return Math.max(1.15, (block.ascent + block.descent) * 1.08) * font;
  }

  private flatHeight(block: FlatBlock, font: number): number {
    return (
      (block.lines.length - 1) * this.lineGap(block, font) + (block.ascent + block.descent) * font
    );
  }

  /**
   * The largest shared font size at which every domain's label fits upright inside its
   * segment, and where each label goes. If even the smallest size doesn't fit (a very
   * long translation), labels that don't fit sit in the middle of their segment.
   */
  private fitFlatLabels(blocks: FlatBlock[], spec: LayoutSpec) {
    const [r1, r2] = spec.domainRing;
    const placeAll = (font: number) =>
      blocks.map((block, index) =>
        placeBox(
          block.width * font,
          this.flatHeight(block, font),
          r1,
          r2,
          index * DOMAIN_SPAN - DOMAIN_SPAN / 2,
          index * DOMAIN_SPAN + DOMAIN_SPAN / 2,
          FLAT_PADDING,
        ),
      );
    let low = spec.domainMinFont;
    let high = spec.domainFont;
    let points: (Point | null)[] = placeAll(high);
    if (points.every(Boolean)) return { font: high, points, blocks };
    points = placeAll(low);
    if (points.every(Boolean)) {
      while (high - low > 0.5) {
        const mid = (low + high) / 2;
        const attempt = placeAll(mid);
        if (attempt.every(Boolean)) {
          low = mid;
          points = attempt;
        } else {
          high = mid;
        }
      }
    }
    return { font: Math.floor(low * 10) / 10, points, blocks };
  }

  /** Baselines for a flat label centred vertically on `centerY`. */
  private flatLines(block: FlatBlock, font: number, centerY: number): TextLine[] {
    const gap = this.lineGap(block, font);
    const top = centerY - this.flatHeight(block, font) / 2;
    return block.lines.map((text, i) => ({
      text,
      y: Math.round((top + block.ascent * font + i * gap) * 100) / 100,
    }));
  }

  /** Vertically centres lines of text on `center` (baseline offsets for each line). */
  private stackLines(lines: string[], font: number, center: number): TextLine[] {
    const lineHeight = font * 1.15;
    return lines.map((text, i) => ({
      text,
      y: Math.round((center + (i - (lines.length - 1) / 2) * lineHeight + font * 0.35) * 100) / 100,
    }));
  }
}
