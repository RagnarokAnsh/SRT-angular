import {
  arcLength,
  boxInSegment,
  fitFontSize,
  isLowerHalf,
  labelLines,
  placeBox,
  polar,
  radialRotation,
  ringSegmentPath,
  textArcPath,
} from './wheel-geometry';

describe('wheel geometry', () => {
  it('measures angles clockwise from the top', () => {
    expect(polar(100, 100, 50, 0)).toEqual({ x: 100, y: 50 });
    expect(polar(100, 100, 50, 90)).toEqual({ x: 150, y: 100 });
    expect(polar(100, 100, 50, 180)).toEqual({ x: 100, y: 150 });
    expect(polar(100, 100, 50, 270)).toEqual({ x: 50, y: 100 });
  });

  it('draws a closed ring segment, using the large-arc flag only past 180°', () => {
    const small = ringSegmentPath(100, 100, 40, 80, 0, 60);
    expect(small.startsWith('M 100 20')).toBe(true);
    expect(small).toContain('A 80 80 0 0 1');
    expect(small).toContain('A 40 40 0 0 0');
    expect(small.endsWith('Z')).toBe(true);
    expect(ringSegmentPath(100, 100, 40, 80, 0, 200)).toContain('A 80 80 0 1 1');
  });

  it('runs text arcs so labels are never upside down', () => {
    expect(isLowerHalf(0)).toBe(false);
    expect(isLowerHalf(180)).toBe(true);
    expect(isLowerHalf(-60)).toBe(false);
    // Upper half: clockwise (sweep 1) from the start angle.
    expect(textArcPath(100, 100, 50, -30, 30)).toMatch(/^M 75 56\.7 A 50 50 0 0 1 125 56\.7$/);
    // Lower half: counter-clockwise (sweep 0) from the end angle.
    expect(textArcPath(100, 100, 50, 150, 210)).toMatch(/^M 75 143\.3 A 50 50 0 0 0 125 143\.3$/);
  });

  it('turns radial labels so they read left to right', () => {
    expect(radialRotation(90)).toBe(0);
    expect(radialRotation(45)).toBe(-45);
    expect(radialRotation(270)).toBe(360);
    expect(radialRotation(300)).toBe(390);
  });

  it('computes arc lengths', () => {
    expect(arcLength(100, 180)).toBeCloseTo(Math.PI * 100);
  });

  it('shrinks the font until every line fits, but not below the minimum', () => {
    const measure = (text: string, size: number) => text.length * size * 0.5;
    expect(fitFontSize([{ text: 'abcd', maxWidth: 100 }], 20, 10, measure)).toBe(20);
    expect(fitFontSize([{ text: 'abcdefghij', maxWidth: 50 }], 20, 6, measure)).toBe(10);
    expect(fitFontSize([{ text: 'abcdefghij', maxWidth: 10 }], 20, 8, measure)).toBe(8);
  });

  it('splits labels on explicit line breaks, joining any extra lines', () => {
    expect(labelLines('Language &\nLiteracy')).toEqual(['Language &', 'Literacy']);
    expect(labelLines(' One ')).toEqual(['One']);
    expect(labelLines('a\nb\nc')).toEqual(['a', 'b c']);
  });
});

describe('flat labels in ring segments', () => {
  // The top segment of a six-part ring: -30° to 30°, radii 80 to 240.
  const top = [80, 240, -30, 30] as const;

  it('accepts a box well inside the segment', () => {
    expect(boxInSegment({ x0: -40, x1: 40, y0: -180, y1: -150 }, ...top, 4)).toBe(true);
  });

  it('rejects boxes that cross the outer edge, a side or the inner circle', () => {
    expect(boxInSegment({ x0: -40, x1: 40, y0: -245, y1: -215 }, ...top, 4)).toBe(false);
    expect(boxInSegment({ x0: 20, x1: 100, y0: -140, y1: -110 }, ...top, 4)).toBe(false);
    // Corners outside the inner circle, but the middle of the bottom edge dips into it.
    expect(boxInSegment({ x0: -30, x1: 30, y0: -100, y1: -78 }, ...top, 4)).toBe(false);
  });

  it('keeps the padding from every edge', () => {
    const box = { x0: -40, x1: 40, y0: -236, y1: -206 }; // 2 units from the outer edge
    expect(boxInSegment(box, ...top, 0)).toBe(true);
    expect(boxInSegment(box, ...top, 4)).toBe(false);
  });

  it('centres a box in the segment, or says it does not fit', () => {
    const point = placeBox(80, 30, ...top, 4);
    expect(point).not.toBeNull();
    expect(point!.x).toBeCloseTo(0);
    expect(point!.y).toBeCloseTo(-160);
    expect(placeBox(400, 30, ...top, 4)).toBeNull();
  });

  it('places side segments without rotating the text', () => {
    // The segment from 30° to 90° (upper right); a wide box sits further out.
    const point = placeBox(110, 50, 80, 240, 30, 90, 4);
    expect(point).not.toBeNull();
    expect(point!.x).toBeGreaterThan(0);
    expect(point!.y).toBeLessThan(0);
  });
});
