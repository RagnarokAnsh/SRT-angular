/**
 * Geometry for the readiness wheel. Angles are in degrees, 0 at the top, growing clockwise;
 * all lengths are in viewBox units.
 */
export interface Point {
  x: number;
  y: number;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function polar(cx: number, cy: number, r: number, angle: number): Point {
  const rad = (angle * Math.PI) / 180;
  return { x: round(cx + r * Math.sin(rad)), y: round(cy - r * Math.cos(rad)) };
}

/** Closed ring segment between radii r1 < r2 and angles a1 < a2. */
export function ringSegmentPath(
  cx: number,
  cy: number,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  const o1 = polar(cx, cy, r2, a1);
  const o2 = polar(cx, cy, r2, a2);
  const i2 = polar(cx, cy, r1, a2);
  const i1 = polar(cx, cy, r1, a1);
  return [
    `M ${o1.x} ${o1.y}`,
    `A ${r2} ${r2} 0 ${large} 1 ${o2.x} ${o2.y}`,
    `L ${i2.x} ${i2.y}`,
    `A ${r1} ${r1} 0 ${large} 0 ${i1.x} ${i1.y}`,
    'Z',
  ].join(' ');
}

/** True when text centred at this angle would be upside down if drawn clockwise. */
export function isLowerHalf(angle: number): boolean {
  const a = ((angle % 360) + 360) % 360;
  return a > 90 && a < 270;
}

/**
 * Open arc for `<textPath>`: clockwise on the upper half, counter-clockwise on the lower
 * half, so the text along it always reads left to right, upright.
 */
export function textArcPath(cx: number, cy: number, r: number, a1: number, a2: number): string {
  const large = a2 - a1 > 180 ? 1 : 0;
  if (isLowerHalf((a1 + a2) / 2)) {
    const start = polar(cx, cy, r, a2);
    const end = polar(cx, cy, r, a1);
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
  }
  const start = polar(cx, cy, r, a1);
  const end = polar(cx, cy, r, a2);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

export function arcLength(r: number, degrees: number): number {
  return (Math.PI * r * degrees) / 180;
}

/**
 * Rotation for a label running along the radius at `angle`: outwards on the right half,
 * inwards on the left half, so it never reads upside down.
 */
export function radialRotation(angle: number): number {
  const a = ((angle % 360) + 360) % 360;
  return a <= 180 ? round(a - 90) : round(a + 90);
}

/** Largest font size (up to `base`) at which every line fits its maximum width. */
export function fitFontSize(
  lines: readonly { text: string; maxWidth: number }[],
  base: number,
  min: number,
  measure: (text: string, fontSize: number) => number,
): number {
  let size = base;
  for (const line of lines) {
    const width = measure(line.text, base);
    if (width > line.maxWidth && width > 0) size = Math.min(size, (base * line.maxWidth) / width);
  }
  return Math.max(min, Math.floor(size * 10) / 10);
}

/** Splits a translated label on explicit line breaks ("Language &\nLiteracy"). */
export function labelLines(label: string, maxLines = 2): string[] {
  const lines = label
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= maxLines) return lines;
  return [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
}

/** An axis-aligned box, relative to the wheel's centre (y grows downwards). */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Signed distance from a point to the ray at `angle`: positive on its clockwise side. */
function clockwiseDistance(angle: number, x: number, y: number): number {
  const rad = (angle * Math.PI) / 180;
  return Math.sin(rad) * y + Math.cos(rad) * x;
}

/**
 * Whether a box lies inside the ring segment between radii r1 < r2 and angles a1 < a2
 * (a span under 180°), keeping `pad` from every edge.
 */
export function boxInSegment(
  box: Box,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
  pad: number,
): boolean {
  const corners: [number, number][] = [
    [box.x0, box.y0],
    [box.x1, box.y0],
    [box.x0, box.y1],
    [box.x1, box.y1],
  ];
  for (const [x, y] of corners) {
    if (Math.hypot(x, y) > r2 - pad) return false;
    if (clockwiseDistance(a1, x, y) < pad || -clockwiseDistance(a2, x, y) < pad) return false;
  }
  // The point of the box nearest the centre must stay clear of the inner circle.
  const nearX = Math.min(Math.max(0, box.x0), box.x1);
  const nearY = Math.min(Math.max(0, box.y0), box.y1);
  return Math.hypot(nearX, nearY) >= r1 + pad;
}

/**
 * Where to centre a `width` × `height` box inside a ring segment: as close as possible to
 * the middle of the segment (relative to the wheel's centre), or null if it doesn't fit.
 */
export function placeBox(
  width: number,
  height: number,
  r1: number,
  r2: number,
  a1: number,
  a2: number,
  pad: number,
): Point | null {
  const mid = (a1 + a2) / 2;
  const midRadius = (r1 + r2) / 2;
  const maxShift = (a2 - a1) / 4;
  let best: { point: Point; score: number } | null = null;
  for (let shift = 0; shift <= maxShift; shift += 1) {
    for (const angle of shift ? [mid - shift, mid + shift] : [mid]) {
      const rad = (angle * Math.PI) / 180;
      for (let r = r1; r <= r2; r += 1) {
        const x = r * Math.sin(rad);
        const y = -r * Math.cos(rad);
        const box = {
          x0: x - width / 2,
          x1: x + width / 2,
          y0: y - height / 2,
          y1: y + height / 2,
        };
        if (!boxInSegment(box, r1, r2, a1, a2, pad)) continue;
        const score = shift * 2 + Math.abs(r - midRadius) * 0.3;
        if (!best || score < best.score) best = { point: { x: round(x), y: round(y) }, score };
      }
    }
  }
  return best?.point ?? null;
}
