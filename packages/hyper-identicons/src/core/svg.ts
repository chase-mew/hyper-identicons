import { CANVAS } from './slots.js';
import { treatmentSvg } from './treatment.js';

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

  const { defs, overlay } = treatmentSvg();

  const dimensions = size === undefined ? '' : ` width="${size}" height="${size}"`;
  const rounded = radius !== undefined && radius > 0;
  const clip = rounded
    ? `<clipPath id="c"><rect width="${CANVAS}" height="${CANVAS}" rx="${radius}" ry="${radius}"/></clipPath>`
    : '';
  const label = title ? `<title>${title}</title>` : '';

  // The treatment's soft-light rects blend with whatever is behind them, so the group
  // has to be its own stacking context. Without `isolation` an inline SVG blends with
  // the page instead of with the cat, and the identicon changes colour depending on
  // what it happens to be sitting on.
  const group =
    `<g style="isolation:isolate"${rounded ? ' clip-path="url(#c)"' : ''}>` +
    `${rects.join('')}${overlay}</g>`;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"${dimensions} shape-rendering="crispEdges">` +
    `${label}<defs>${clip}${defs}</defs>${group}</svg>`
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
