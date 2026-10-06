import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Measures text width with the app's font, for SVG labels that must fit a shape. */
@Injectable({ providedIn: 'root' })
export class TextMeasurer {
  private readonly document = inject(DOCUMENT);
  private context: CanvasRenderingContext2D | null | undefined;

  measure(text: string, fontSize: number, weight = 600): number {
    const context = this.getContext();
    // Without canvas support, estimate from the character count.
    if (!context) return Array.from(text).length * fontSize * 0.56;
    context.font = `${weight} ${fontSize}px Figtree, "Noto Sans Devanagari", system-ui, sans-serif`;
    return context.measureText(text).width;
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
