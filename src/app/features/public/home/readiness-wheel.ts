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
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@jsverse/transloco';

import {
  FRAMEWORK,
  FRAMEWORK_COMPETENCY_COUNT,
  type FrameworkDomain,
} from '@core/catalog/framework';
import { LanguageService } from '@core/i18n/language';
import { TextMeasurer } from '@shared/text-measurer';

import {
  type Point,
  fitFontSize,
  labelLines,
  placeBox,
  polar,
  ringSegmentPath,
} from './wheel-geometry';

type Layout = 'compact' | 'full';

interface LayoutSpec {
  hub: number;
  domainRing: readonly [number, number];
  /**
   * Wider screens: while a domain's competencies show, the domains move into `ring` (with
   * labels up to `font`) and the competencies fan out in the band outside it, `fan`.
   */
  open: { ring: readonly [number, number]; fan: readonly [number, number]; font: number } | null;
  hubFont: number;
  domainFont: number;
  domainMinFont: number;
  competencyFont: number;
  competencyMinFont: number;
}

const SIZE = 500;
const CENTER = SIZE / 2;
/** Below this rendered width the domains fill the wheel, and tapping one zooms into it. */
const FULL_LAYOUT_MIN_PX = 520;

const LAYOUTS: Record<Layout, LayoutSpec> = {
  // Phones: the domains fill the wheel, so their full names stay large; a tapped domain
  // shows its competencies all around it.
  compact: {
    hub: 46,
    domainRing: [50, 248],
    open: null,
    hubFont: 24,
    domainFont: 30,
    domainMinFont: 14,
    competencyFont: 32,
    competencyMinFont: 16,
  },
  // Wider screens: the domains fill the wheel too. With the pointer on one, they draw in
  // and its competencies fan out around it.
  full: {
    hub: 56,
    domainRing: [60, 248],
    open: { ring: [60, 162], fan: [166, 248], font: 17 },
    hubFont: 19,
    domainFont: 22,
    domainMinFont: 11,
    competencyFont: 16,
    competencyMinFont: 11,
  },
};

const DOMAIN_SPAN = 360 / FRAMEWORK.length;
/** Each competency's share of the fan, in degrees. */
const FAN_STEP = 46;
/** A zoomed-in domain: its name on a disc of this radius, its competencies around it. */
const ZOOM_DISC = 112;
/** Space between a label and the edges of its segment. */
const PADDING = 7;
/** Canvas and SVG text widths can differ slightly; leave a little room. */
const WIDTH_SAFETY = 1.04;
/**
 * How long the pointer rests on a domain before its competencies show: a moment, so the
 * wheel doesn't change as the pointer just crosses it; a little longer when another
 * domain's are showing.
 */
const HOVER_OPEN_MS = 90;
const HOVER_SWITCH_MS = 140;
/** How long the competencies stay after the pointer leaves the wheel. */
const LEAVE_MS = 300;
/** After Escape the domains grow back under a still pointer: that's not a new hover. */
const QUIET_AFTER_ESCAPE_MS = 450;
/** A little longer than the domains take to draw in (see the styles). */
const OPENING_MS = 400;

interface TextLine {
  text: string;
  y: number;
}

interface Label {
  x: number;
  lines: TextLine[];
}

interface Block {
  lines: string[];
  /** Per unit of font size. */
  width: number;
  ascent: number;
  descent: number;
}

interface Sector {
  r1: number;
  r2: number;
  a1: number;
  a2: number;
}

interface DomainView {
  index: number;
  slug: string;
  name: string;
  color: string;
  tint: string;
  path: string;
  /** Wider screens: the domain while competencies show, and where its label moves. */
  open: { path: string; labelFrom: string; labelTo: string } | null;
  /** Wider screens: the band outside the domain, so the pointer there still points at it. */
  track: string | null;
  label: Label;
}

interface CompetencyView {
  slug: string;
  name: string;
  path: string;
  label: Label;
}

/**
 * The school readiness framework as a wheel: the six domains around the centre. On wider
 * screens, with the pointer on a domain the domains draw in and its competencies fan out
 * around it (a line under the wheel says so); on phones, tapping a domain shows its
 * competencies all around it (tap the middle to go back). Tapping a competency opens it
 * (visitors sign in first). Every part can be reached with the keyboard, and the labels are
 * sized to fit their segment in every language.
 */
@Component({
  selector: 'app-readiness-wheel',
  imports: [MatIconModule, TranslocoPipe],
  templateUrl: './readiness-wheel.html',
  styleUrl: './readiness-wheel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class ReadinessWheel {
  private readonly transloco = inject(TranslocoService);
  private readonly language = inject(LanguageService);
  private readonly measurer = inject(TextMeasurer);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  /**
   * Whether competencies open their pages. Off for signed-in users whose role can't open
   * them (the wheel then only explains the framework).
   */
  readonly linked = input(true);

  private readonly wheel = viewChild.required<ElementRef<HTMLElement>>('wheel');

  protected readonly size = SIZE;
  protected readonly center = CENTER;
  protected readonly zoomDisc = ZOOM_DISC;
  /** A small × at the top of a zoomed-in domain's disc: tapping the disc goes back. */
  protected readonly closeMark = cross(CENTER, CENTER - ZOOM_DISC + 22, 7);
  /**
   * A first guess from the window width, so desktops don't flash the phone layout before
   * the wheel is measured.
   */
  protected readonly layout = signal<Layout>(
    (this.document.defaultView?.innerWidth ?? 0) >= 1024 ? 'full' : 'compact',
  );
  /** The domain whose competencies are showing. */
  protected readonly expanded = signal<number | null>(null);
  /** The domains are drawing in: the competencies wait until there's room for them. */
  protected readonly opening = signal(false);
  /** Bumped when web fonts finish loading, so labels are re-measured with the real font. */
  private readonly fontsVersion = signal(0);
  /** Touch screens are told to tap, not to point. Follows the last pointer used. */
  private readonly touch = signal(
    this.document.defaultView?.matchMedia?.('(hover: none)').matches ?? false,
  );
  /** Browsers that can't animate a shape change (Safari) move the labels at once too. */
  protected readonly morphs =
    typeof CSS === 'undefined' || !CSS.supports || CSS.supports('d', 'path("M 0 0")');

  private hoverTimer: ReturnType<typeof setTimeout> | null = null;
  private leaveTimer: ReturnType<typeof setTimeout> | null = null;
  private openingTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPointer = 'mouse';
  /** Focus moved back by the wheel itself (after Escape): don't open that domain again. */
  private quietFocus = false;
  private quietPointerUntil = 0;

  protected readonly spec = computed(() => LAYOUTS[this.layout()]);
  /** Wider screens, while a domain's competencies show. */
  protected readonly isOpen = computed(() => this.expanded() !== null && !!this.spec().open);

  protected readonly model = computed(() => {
    this.language.current();
    this.fontsVersion();
    return this.buildModel(this.spec());
  });

  /** Wider screens: the expanded domain's competencies, fanned out around it. */
  protected readonly fan = computed(() => {
    const index = this.expanded();
    const ring = this.spec().open?.fan;
    if (index === null || !ring) return null;
    this.language.current();
    this.fontsVersion();
    const domain = FRAMEWORK[index];
    const total = domain.competencies.length * FAN_STEP;
    const start = index * DOMAIN_SPAN - total / 2;
    const sectors = domain.competencies.map((_, i) => ({
      r1: ring[0],
      r2: ring[1],
      a1: start + i * FAN_STEP,
      a2: start + (i + 1) * FAN_STEP,
    }));
    return { index, tint: domain.tint, ...this.competencyViews(domain, sectors) };
  });

  /** Phones: the expanded domain, zoomed in. */
  protected readonly zoom = computed(() => {
    const index = this.expanded();
    if (index === null || this.spec().open) return null;
    this.language.current();
    this.fontsVersion();
    const domain = FRAMEWORK[index];
    const step = 360 / domain.competencies.length;
    // Upright labels have more room in some directions than others: of the two ways of
    // turning the ring, keep the one where the labels can be largest.
    const [views] = [0, step / 2]
      .map((offset) =>
        this.competencyViews(
          domain,
          domain.competencies.map((_, i) => ({
            r1: ZOOM_DISC + 4,
            r2: 248,
            a1: offset + i * step - step / 2,
            a2: offset + i * step + step / 2,
          })),
        ),
      )
      .sort((a, b) => b.competencyFont - a.competencyFont);
    const t = (key: string) => this.transloco.translate(key);
    const block = this.block(labelLines(t(`catalog.domains.${domain.slug}.wheel`), 3));
    // The disc's name sits below a small close mark.
    const font = this.fitInDisc(block, ZOOM_DISC - 24, this.spec().domainFont);
    return {
      index,
      name: t(`catalog.domains.${domain.slug}.name`),
      color: domain.color,
      tint: domain.tint,
      label: { x: CENTER, lines: this.flatLines(block, font, CENTER + 12) },
      font,
      ...views,
    };
  });

  protected readonly summary = computed(() => {
    this.language.current();
    return this.transloco.translate('home.wheel.summary', {
      domains: FRAMEWORK.length,
      competencies: FRAMEWORK_COMPETENCY_COUNT,
    });
  });

  /** Wider screens: what to do next, under the wheel. Phones need no telling. */
  protected readonly hint = computed(() => {
    if (!this.spec().open) return null;
    const touch = this.touch();
    if (this.expanded() !== null && this.linked()) {
      return touch
        ? { key: 'home.wheel.hintCompetencyTap', icon: 'tap' }
        : { key: 'home.wheel.hintCompetencyClick', icon: 'click' };
    }
    return touch
      ? { key: 'home.wheel.hintDomainTap', icon: 'tap' }
      : { key: 'home.wheel.hintDomainHover', icon: 'pointer' };
  });

  constructor() {
    afterNextRender(() => this.observe());
    inject(DestroyRef).onDestroy(() => {
      this.cancelTimers();
      if (this.openingTimer) clearTimeout(this.openingTimer);
    });
  }

  // Pointer

  protected onPointerDown(event: PointerEvent): void {
    this.lastPointer = event.pointerType;
    this.touch.set(event.pointerType !== 'mouse');
  }

  /** Mouse only: resting on a domain shows its competencies. */
  protected onPointerOver(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.spec().open) return;
    this.touch.set(false);
    if (performance.now() < this.quietPointerUntil) return;
    this.clearLeave();
    const target = event.target as Element | null;
    if (target?.closest('[data-competency]')) {
      this.clearHover();
      return;
    }
    const index = this.domainOf(target);
    if (index === null) return;
    if (index === this.expanded()) {
      this.clearHover();
      return;
    }
    this.clearHover();
    // Moving across the wheel towards a competency shouldn't switch to the domains passed.
    this.hoverTimer = setTimeout(
      () => this.show(index),
      this.expanded() === null ? HOVER_OPEN_MS : HOVER_SWITCH_MS,
    );
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || !this.spec().open) return;
    this.clearHover();
    this.clearLeave();
    this.leaveTimer = setTimeout(() => this.expanded.set(null), LEAVE_MS);
  }

  protected onClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    const competency = target?.closest('[data-competency]')?.getAttribute('data-competency');
    if (competency) {
      this.open(competency);
      return;
    }
    if (target?.closest('[data-back]')) {
      this.collapse();
      return;
    }
    const index = this.domainOf(target);
    if (index !== null) {
      this.clearHover();
      const mouse = this.lastPointer === 'mouse' && this.spec().open;
      // A tap shows a domain's competencies, or hides them again; a click keeps them.
      if (!mouse && this.expanded() === index) this.collapse();
      else this.show(index);
      return;
    }
    if (this.lastPointer !== 'mouse') this.collapse();
  }

  /** A tap anywhere else on the page closes the competencies. */
  protected onDocumentPointerDown(event: PointerEvent): void {
    if (this.expanded() === null || event.pointerType === 'mouse') return;
    const element = this.wheel().nativeElement;
    if (!element.contains(event.target as Node)) this.collapse();
  }

  // Keyboard

  /**
   * Tabbing to a domain shows its competencies. A tap or click focuses it too, but then the
   * click decides (otherwise a tap would show them and at once hide them again).
   */
  protected onDomainFocus(event: FocusEvent, index: number): void {
    if (this.quietFocus) {
      this.quietFocus = false;
      return;
    }
    if (this.spec().open && isFocusVisible(event.target as Element)) this.show(index);
  }

  /** Enter or Space shows the domain's competencies and moves to the first of them. */
  protected onDomainKey(event: KeyboardEvent, index: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.show(index);
    this.focusLater('.competency[tabindex], [data-back]');
  }

  protected onCompetencyKey(event: KeyboardEvent, slug: string): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.open(slug);
  }

  protected onBackKey(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.onEscape();
  }

  /** Hides the competencies and goes back to their domain. */
  protected onEscape(): void {
    const index = this.expanded();
    if (index === null) return;
    this.collapse();
    this.quietPointerUntil = performance.now() + QUIET_AFTER_ESCAPE_MS;
    this.quietFocus = true;
    this.focusLater(`[data-domain="${index}"][tabindex]`);
  }

  private open(slug: string): void {
    if (!this.linked()) return;
    void this.router.navigate(['/competencies/find', slug]);
  }

  /** Shows a domain's competencies. */
  private show(index: number): void {
    if (this.expanded() === null && this.spec().open) {
      this.opening.set(true);
      if (this.openingTimer) clearTimeout(this.openingTimer);
      this.openingTimer = setTimeout(() => this.opening.set(false), OPENING_MS);
    }
    this.expanded.set(index);
  }

  private collapse(): void {
    this.cancelTimers();
    this.expanded.set(null);
  }

  private domainOf(target: Element | null): number | null {
    const value = target?.closest('[data-domain]')?.getAttribute('data-domain');
    return value === null || value === undefined ? null : Number(value);
  }

  private focusLater(selector: string): void {
    afterNextRender(
      () => {
        const target = this.wheel().nativeElement.querySelector<SVGElement>(selector);
        if (target) target.focus();
        else this.quietFocus = false;
      },
      { injector: this.injector },
    );
  }

  private clearHover(): void {
    if (this.hoverTimer) clearTimeout(this.hoverTimer);
    this.hoverTimer = null;
  }

  private clearLeave(): void {
    if (this.leaveTimer) clearTimeout(this.leaveTimer);
    this.leaveTimer = null;
  }

  private cancelTimers(): void {
    this.clearHover();
    this.clearLeave();
  }

  private observe(): void {
    const element = this.wheel().nativeElement;
    const destroyRef = this.injector.get(DestroyRef);
    const update = (width: number) => {
      const layout: Layout = width >= FULL_LAYOUT_MIN_PX ? 'full' : 'compact';
      if (layout !== this.layout()) this.collapse();
      this.layout.set(layout);
    };
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

  // Layout

  private buildModel(spec: LayoutSpec) {
    const t = (key: string) => this.transloco.translate(key);

    const hubLines = labelLines(t('home.wheel.hub'));
    const hubFont = fitFontSize(
      hubLines.map((text) => ({ text, maxWidth: spec.hub * 1.6 })),
      spec.hubFont,
      10,
      (text, size) => this.measurer.measure(text, size, 700),
    );

    const blocks = FRAMEWORK.map((domain) =>
      this.block(labelLines(t(`catalog.domains.${domain.slug}.wheel`), 3)),
    );
    const rest = this.domainRing(blocks, spec.domainRing, spec.domainFont, spec.domainMinFont);
    const open = spec.open
      ? this.domainRing(blocks, spec.open.ring, spec.open.font, spec.domainMinFont)
      : null;

    const domains: DomainView[] = FRAMEWORK.map((domain, index) => {
      const at = rest.centers[index];
      // The label is drawn where it sits at rest; while competencies show, it moves to its
      // place in the smaller ring, scaled down to that ring's font size.
      const to = (place: Point, scale: number) =>
        `translate(${place.x}px, ${place.y}px) scale(${scale}) translate(${-at.x}px, ${-at.y}px)`;
      return {
        index,
        slug: domain.slug,
        name: t(`catalog.domains.${domain.slug}.name`),
        color: domain.color,
        tint: domain.tint,
        path: rest.paths[index],
        open: open && {
          path: open.paths[index],
          labelFrom: to(at, 1),
          labelTo: to(open.centers[index], round(open.font / rest.font)),
        },
        track: spec.open
          ? ringSegmentPath(
              CENTER,
              CENTER,
              spec.open.ring[1],
              spec.open.fan[1],
              index * DOMAIN_SPAN - DOMAIN_SPAN / 2,
              index * DOMAIN_SPAN + DOMAIN_SPAN / 2,
            )
          : null,
        label: { x: at.x, lines: this.flatLines(blocks[index], rest.font, at.y) },
      };
    });

    return {
      hub: this.stackLines(hubLines, hubFont, CENTER),
      hubFont,
      domainFont: rest.font,
      domains,
    };
  }

  /**
   * The domains as a ring from r1 to r2, and where each label is centred at the largest size
   * they all fit.
   */
  private domainRing(
    blocks: Block[],
    [r1, r2]: readonly [number, number],
    max: number,
    min: number,
  ) {
    const sectors = FRAMEWORK.map((_, index) => ({
      r1,
      r2,
      a1: index * DOMAIN_SPAN - DOMAIN_SPAN / 2,
      a2: index * DOMAIN_SPAN + DOMAIN_SPAN / 2,
    }));
    const fit = this.fitBlocks(blocks, sectors, max, min);
    return {
      font: fit.font,
      paths: sectors.map(({ a1, a2 }) => ringSegmentPath(CENTER, CENTER, r1, r2, a1, a2)),
      centers: sectors.map((_, index) => {
        const point = fit.points[index] ?? polar(0, 0, (r1 + r2) / 2, index * DOMAIN_SPAN);
        return { x: round(CENTER + point.x), y: round(CENTER + point.y) };
      }),
    };
  }

  /** One label per competency, upright inside its sector, all at the same size. */
  private competencyViews(domain: FrameworkDomain, sectors: Sector[]) {
    const t = (key: string) => this.transloco.translate(key);
    const spec = this.spec();
    const blocks = domain.competencies.map((slug) =>
      this.block(labelLines(t(`catalog.competencies.${slug}.wheel`))),
    );
    const fit = this.fitBlocks(blocks, sectors, spec.competencyFont, spec.competencyMinFont);
    const competencies: CompetencyView[] = domain.competencies.map((slug, i) => {
      const { r1, r2, a1, a2 } = sectors[i];
      const point = fit.points[i] ?? polar(0, 0, (r1 + r2) / 2, (a1 + a2) / 2);
      return {
        slug,
        name: t(`catalog.competencies.${slug}.name`),
        path: ringSegmentPath(CENTER, CENTER, r1, r2, a1, a2),
        label: {
          x: round(CENTER + point.x),
          lines: this.flatLines(blocks[i], fit.font, CENTER + point.y),
        },
      };
    });
    return { competencies, competencyFont: fit.font };
  }

  /** Measures a label's lines once, per unit of font size. */
  private block(lines: string[]): Block {
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
  private lineGap(block: Block, font: number): number {
    return Math.max(1.15, (block.ascent + block.descent) * 1.08) * font;
  }

  private height(block: Block, font: number): number {
    return (
      (block.lines.length - 1) * this.lineGap(block, font) + (block.ascent + block.descent) * font
    );
  }

  /**
   * The largest shared font size at which every label fits upright inside its sector, and
   * where each label goes. If even the smallest size doesn't fit (a very long translation),
   * labels that don't fit sit in the middle of their sector.
   */
  private fitBlocks(blocks: Block[], sectors: Sector[], max: number, min: number) {
    const placeAll = (font: number) =>
      blocks.map((block, i) => {
        const { r1, r2, a1, a2 } = sectors[i];
        return placeBox(block.width * font, this.height(block, font), r1, r2, a1, a2, PADDING);
      });
    let low = min;
    let high = max;
    let points: (Point | null)[] = placeAll(high);
    if (points.every(Boolean)) return { font: high, points };
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
    return { font: Math.floor(low * 10) / 10, points };
  }

  /** The largest font size (up to `max`) at which the block fits inside a circle. */
  private fitInDisc(block: Block, radius: number, max: number): number {
    let font = max;
    while (font > 10) {
      const halfWidth = (block.width * font) / 2;
      const halfHeight = this.height(block, font) / 2;
      if (Math.hypot(halfWidth, halfHeight) <= radius) break;
      font -= 0.5;
    }
    return font;
  }

  /** Baselines for a label centred vertically on `centerY`. */
  private flatLines(block: Block, font: number, centerY: number): TextLine[] {
    const gap = this.lineGap(block, font);
    const top = centerY - this.height(block, font) / 2;
    return block.lines.map((text, i) => ({
      text,
      y: round(top + block.ascent * font + i * gap),
    }));
  }

  /** Vertically centres lines of text on `center` (baseline offsets for each line). */
  private stackLines(lines: string[], font: number, center: number): TextLine[] {
    const lineHeight = font * 1.15;
    return lines.map((text, i) => ({
      text,
      y: round(center + (i - (lines.length - 1) / 2) * lineHeight + font * 0.35),
    }));
  }
}

/** Focus from the keyboard, not from a pointer. */
function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible');
  } catch {
    return true;
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

function cross(x: number, y: number, r: number): string {
  return `M ${x - r} ${y - r} L ${x + r} ${y + r} M ${x + r} ${y - r} L ${x - r} ${y + r}`;
}
