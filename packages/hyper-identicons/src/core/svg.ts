import { CANVAS } from './slots.js';

export interface SvgOptions {
  /** Rendered width and height in CSS pixels. Omit for a scale-free SVG. */
  size?: number;
  /** Corner radius in canvas units (0-24). 24 is a circle. */
  radius?: number;
  title?: string;
}

/** One rect per horizontal run of identical colour. See spec/v1.md §5. */
export function toSvg(pixels: readonly string[], options: SvgOptions = {}): string {
  const { size, radius, title } = options;

  const rects: string[] = [];
  for (let row = 0; row < CANVAS; row++) {
    let runStart = 0;
    while (runStart < CANVAS) {
      const color = pixels[row * CANVAS + runStart]!;
      let runEnd = runStart + 1;
      while (runEnd < CANVAS && pixels[row * CANVAS + runEnd] === color) runEnd++;
      rects.push(`<rect x="${runStart}" y="${row}" width="${runEnd - runStart}" height="1" fill="${color}"/>`);
      runStart = runEnd;
    }
  }

  const dimensions = size === undefined ? '' : ` width="${size}" height="${size}"`;
  const clip =
    radius === undefined || radius <= 0
      ? ''
      : `<defs><clipPath id="c"><rect width="${CANVAS}" height="${CANVAS}" rx="${radius}" ry="${radius}"/></clipPath></defs>`;
  const open = clip ? '<g clip-path="url(#c)">' : '';
  const close = clip ? '</g>' : '';
  const label = title ? `<title>${title}</title>` : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dimensions} shape-rendering="crispEdges">` +
    `${label}${clip}${open}${rects.join('')}${close}</svg>`
  );
}

export function toDataUri(svg: string): string {
  const escaped = svg
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E')
    .replace(/\s+/g, ' ');
  return `data:image/svg+xml,${escaped}`;
}
