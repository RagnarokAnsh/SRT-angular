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
  arcLength,
  fitFontSize,
  isLowerHalf,
  labelLines,
  polar,
  radialRotation,
  ringSegmentPath,
  textArcPath,
} from './wheel-geometry';

type Layout = 'compact' | 'full';

interface LayoutSpec {
  hub: number;
  domainRing: readonly [number, number];
  competencyRing: readonly [number, number];
  hubFont: number;
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
  // Phones: a wide domain ring with big labels; competencies are a thin colour band and
  // are named in the panel instead.
  compact: {
    hub: 84,
    domainRing: [90, 226],
    competencyRing: [232, 246],
    hubFont: 27,
    domainFont: 30,
    domainMinFont: 21,
    competencyFont: 0,
    competencyMinFont: 0,
  },
  full: {
    hub: 56,
    domainRing: [62, 138],
    competencyRing: [144, 240],
    hubFont: 18,
    domainFont: 17,
    domainMinFont: 12,
    competencyFont: 13.5,
    competencyMinFont: 10,
  },
};

const DOMAIN_SPAN = 360 / FRAMEWORK.length;
const ARC_PADDING_DEG = 2;
const RADIAL_PADDING = 8;

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
  path: string;
  label: { transform: string; lines: TextLine[] } | null;
}

interface DomainView {
  index: number;
  slug: string;
  name: string;
  color: string;
  tint: string;
  path: string;
  labels: DomainLabel[];
  competencies: CompetencyView[];
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
  protected readonly layout = signal<Layout>('compact');
  protected readonly selected = signal<number | null>(null);
  /** Bumped when web fonts finish loading, so labels are re-measured with the real font. */
  private readonly fontsVersion = signal(0);

  /** `<textPath>` needs the page URL: a bare `#id` would resolve against `<base href>`. */
  protected readonly pageUrl =
    this.document.location.pathname + this.document.location.search;

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

  protected step(delta: number): void {
    const current = this.selected() ?? 0;
    const count = FRAMEWORK.length;
    this.select((current + delta + count) % count);
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

    // Domain labels: fit every line on its arc, then share one size across the ring.
    const [d1, d2] = spec.domainRing;
    const domainMid = (d1 + d2) / 2;
    const lineRadii = (lines: number, font: number, lower: boolean): number[] => {
      if (lines < 2) return [domainMid];
      const offset = font * 0.62;
      // Upper half: the first line is outermost; lower half (flipped text): innermost.
      return lower ? [domainMid - offset, domainMid + offset] : [domainMid + offset, domainMid - offset];
    };
    const domainLines = FRAMEWORK.map((domain, index) => {
      const mid = index * DOMAIN_SPAN;
      return { index, mid, lower: isLowerHalf(mid), lines: labelLines(t(`catalog.domains.${domain.slug}.wheel`)) };
    });
    const usableDeg = DOMAIN_SPAN - 2 * ARC_PADDING_DEG;
    const domainFont = fitFontSize(
      domainLines.flatMap(({ lines, lower }) => {
        const radii = lineRadii(lines.length, spec.domainFont, lower);
        return lines.map((text, i) => ({ text, maxWidth: arcLength(radii[i], usableDeg) * 0.94 }));
      }),
      spec.domainFont,
      spec.domainMinFont,
      measure,
    );

    // Competency labels run along the radius (full layout only).
    const [c1, c2] = spec.competencyRing;
    const competencyMid = (c1 + c2) / 2;
    const competencyLines = FRAMEWORK.flatMap((domain) =>
      domain.competencies.map((slug) => labelLines(t(`catalog.competencies.${slug}.wheel`))),
    );
    const competencyFont = spec.competencyFont
      ? fitFontSize(
          competencyLines.flat().map((text) => ({ text, maxWidth: c2 - c1 - 2 * RADIAL_PADDING })),
          spec.competencyFont,
          spec.competencyMinFont,
          measure,
        )
      : 0;

    const domains: DomainView[] = FRAMEWORK.map((domain, index) => {
      const start = index * DOMAIN_SPAN - DOMAIN_SPAN / 2;
      const end = start + DOMAIN_SPAN;
      const { lower, lines } = domainLines[index];
      const radii = lineRadii(lines.length, domainFont, lower);
      const labels = lines.map((text, i) => {
        // Centre the glyphs on the line radius (text sits on the outside of the baseline
        // on the upper half, on the inside when flipped on the lower half).
        const baseline = radii[i] + (lower ? 0.35 : -0.35) * domainFont;
        return {
          id: `${this.idPrefix}-d${index}-${i}`,
          arc: textArcPath(CENTER, CENTER, baseline, start + ARC_PADDING_DEG, end - ARC_PADDING_DEG),
          text,
        };
      });

      const span = DOMAIN_SPAN / domain.competencies.length;
      const competencies = domain.competencies.map((slug, i) => {
        const a1 = start + i * span;
        const a2 = a1 + span;
        let label: CompetencyView['label'] = null;
        if (competencyFont) {
          const angle = (a1 + a2) / 2;
          const point = polar(CENTER, CENTER, competencyMid, angle);
          label = {
            transform: `translate(${point.x} ${point.y}) rotate(${radialRotation(angle)})`,
            lines: this.stackLines(labelLines(t(`catalog.competencies.${slug}.wheel`)), competencyFont, 0),
          };
        }
        return {
          slug,
          name: t(`catalog.competencies.${slug}.name`),
          path: ringSegmentPath(CENTER, CENTER, c1, c2, a1, a2),
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
        competencies,
      };
    });

    return { hub, hubFont, domainFont, competencyFont, domains };
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
