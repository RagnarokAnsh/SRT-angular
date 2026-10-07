import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Measures text width with the app's font, for SVG labels that must fit a shape. */
@Injectable({ providedIn: 'root' })
export class TextMeasurer {
  private readonly document = inject(DOCUMENT);
  private context: CanvasRenderingContext2D | null | undefined;

  measure(text: string, fontSize: number, weight = 600): number {
    return this.metrics(text, fontSize, weight).width;
  }

  /** Width and the height of the glyphs above and below the baseline. */
  metrics(
    text: string,
    fontSize: number,
    weight = 600,
  ): { width: number; ascent: number; descent: number } {
    const context = this.getContext();
    // Without canvas support, estimate from the character count.
    if (!context) {
      return {
        width: Array.from(text).length * fontSize * 0.56,
        ascent: fontSize * 0.75,
        descent: fontSize * 0.25,
      };
    }
    context.font = `${weight} ${fontSize}px Figtree, "Noto Sans Devanagari", system-ui, sans-serif`;
    const m = context.measureText(text);
    const known = (value: number, fallback: number) => (Number.isFinite(value) ? value : fallback);
    return {
      width: m.width,
      ascent: known(m.actualBoundingBoxAscent, fontSize * 0.75),
      descent: known(m.actualBoundingBoxDescent, fontSize * 0.25),
    };
  }

  private getContext(): CanvasRenderingContext2D | null {
    if (this.context === undefined) {
      try {
        this.context = this.document.createElement('canvas').getContext('2d');
      } catch {
        this.context = null;
      }
    }
    return this.context;
  }
}
