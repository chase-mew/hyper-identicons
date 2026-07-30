import { CANVAS } from './slots.js';

/**
 * The house treatment: a warm-over-cool split tone with a vignette, laid over every
 * identicon after the art is composited.
 *
 * It exists because the trait system guarantees an incoherent picture. A wallet
 * picks its background, fur, garment, eyes and hat from five independent lists, so
 * any one cat is a handful of unrelated hues sitting next to each other and a wall
 * of them is worse. Miniature painters have the same problem with a squad of models
 * painted at different times and solve it the same way, with a wash: one translucent
 * pass over the finished piece that drags every colour a little towards a common one
 * without hiding any of them. The traits stay as distinguishable as they were --
 * nothing here moves a hue far enough to be confused with a different trait -- but
 * the set stops looking like a bag of stickers.
 *
 * Warm at the top, cool at the bottom, and the corners pulled down. Two thirds of
 * that is a light direction rather than a filter, which is why it reads as one image
 * rather than as a tint sitting on top of one.
 */

/** Sunset above. */
const WARM = '#FF9E5E';
const WARM_STRENGTH = 0.75;
/** Dusk below. */
const COOL = '#4B4FA8';
const COOL_STRENGTH = 0.7;
/** How far down the canvas each tone travels before it has faded out entirely. */
const REACH = 0.55;

/**
 * Deliberately off-centre and vertically. The eye reads a vignette centred on the
 * geometric middle of a square as a lens artefact; centred a little above it, over
 * the face, it reads as the subject being lit.
 */
const VIGNETTE_CX = 0.5;
const VIGNETTE_CY = 0.45;
const VIGNETTE_START = 0.38;
/**
 * Peak darkening at the corners.
 *
 * It was 0.385, and on a deep background that is most of what made the set look
 * dull: the field is already the darkest thing on the canvas and the corners were
 * being taken down another third from there, so four of the eight tiles in a row
 * arrived at near-black whatever hue they were nominally painted. Lighting the
 * subject needs far less than that, and the falloff is still plainly visible.
 */
const VIGNETTE_MAX = 0.22;
/**
 * CSS sizes a `farthest-corner` ellipse so that its radii are the corner offsets
 * scaled by root two. Reproduced rather than eyeballed so the SVG and the raster
 * path below cannot drift apart from each other.
 */
const VIGNETTE_RX = Math.max(VIGNETTE_CX, 1 - VIGNETTE_CX) * Math.SQRT2;
const VIGNETTE_RY = Math.max(VIGNETTE_CY, 1 - VIGNETTE_CY) * Math.SQRT2;

const trim = (value: number) => Number(value.toFixed(4));

/**
 * The gradients and the three rects that paint them, for the vector path.
 *
 * The vignette needs no blend mode. Multiplying by black at alpha a leaves
 * `src * (1 - a)`, and compositing black normally at alpha a leaves `src * (1 - a)`
 * as well, so the two are the same operation and the plain one is cheaper and more
 * portable. The split tone genuinely needs soft-light: composited normally, a warm
 * layer washes the image towards orange instead of warming what is already there.
 */
export function treatmentSvg(): { defs: string; overlay: string } {
  const rx = VIGNETTE_RX * CANVAS;
  const ry = VIGNETTE_RY * CANVAS;
  const cx = VIGNETTE_CX * CANVAS;
  const cy = VIGNETTE_CY * CANVAS;
  const fade = REACH * CANVAS;

  const defs =
    `<linearGradient id="tw" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="${trim(fade)}">` +
    `<stop offset="0" stop-color="${WARM}"/><stop offset="1" stop-color="${WARM}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<linearGradient id="tc" gradientUnits="userSpaceOnUse" x1="0" y1="${CANVAS}" x2="0" y2="${trim(CANVAS - fade)}">` +
    `<stop offset="0" stop-color="${COOL}"/><stop offset="1" stop-color="${COOL}" stop-opacity="0"/>` +
    `</linearGradient>` +
    `<radialGradient id="tv" gradientUnits="userSpaceOnUse" cx="${trim(cx)}" cy="${trim(cy)}" r="${trim(rx)}"` +
    ` gradientTransform="translate(0 ${trim(cy)}) scale(1 ${trim(ry / rx)}) translate(0 ${trim(-cy)})">` +
    `<stop offset="${VIGNETTE_START}" stop-opacity="0"/><stop offset="1" stop-opacity="${VIGNETTE_MAX}"/>` +
    `</radialGradient>`;

  // `shape-rendering="auto"` undoes the root's `crispEdges` for these three. The art
  // needs hard pixel edges and a gradient needs the opposite; inheriting crispEdges
  // lets a renderer decide the smooth ramp is an edge to be sharpened and step it.
  const box = `width="${CANVAS}" height="${CANVAS}" shape-rendering="auto"`;
  const overlay =
    `<rect ${box} fill="url(#tw)" opacity="${WARM_STRENGTH}" style="mix-blend-mode:soft-light"/>` +
    `<rect ${box} fill="url(#tc)" opacity="${COOL_STRENGTH}" style="mix-blend-mode:soft-light"/>` +
    `<rect ${box} fill="url(#tv)"/>`;

  return { defs, overlay };
}

/** W3C compositing soft-light, per channel, both operands in 0-1. */
function softLight(backdrop: number, source: number): number {
  const d =
    backdrop <= 0.25 ? ((16 * backdrop - 12) * backdrop + 4) * backdrop : Math.sqrt(backdrop);
  return source <= 0.5
    ? backdrop - (1 - 2 * source) * backdrop * (1 - backdrop)
    : backdrop + (2 * source - 1) * (d - backdrop);
}

const channels = (color: string): [number, number, number] => [
  Number.parseInt(color.slice(1, 3), 16) / 255,
  Number.parseInt(color.slice(3, 5), 16) / 255,
  Number.parseInt(color.slice(5, 7), 16) / 255,
];

const byte = (value: number) =>
  Math.round(Math.min(1, Math.max(0, value)) * 255)
    .toString(16)
    .padStart(2, '0');

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/**
 * The same treatment computed per pixel, for anything rasterising the grid directly
 * rather than handing an SVG to a browser.
 *
 * This is a second expression of what `treatmentSvg` describes, which is a thing
 * worth being uncomfortable about — but the alternative is worse. Baking the
 * gradients into the pixel grid and letting the vector path use that would turn a
 * few hundred run-length rects into one per pixel, because a smooth gradient breaks
 * every horizontal run; the SVG goes from a few kilobytes to well over a hundred and
 * the whole inline-data-URI story with it. So the vector path stays vector and this
 * exists for the raster one. The constants are shared, which is where drift would
 * actually hurt.
 */
export function treatPixels(pixels: readonly string[]): string[] {
  const warm = channels(WARM);
  const cool = channels(COOL);
  const out = new Array<string>(pixels.length);

  for (let y = 0; y < CANVAS; y++) {
    const v = (y + 0.5) / CANVAS;
    const warmAlpha = WARM_STRENGTH * clamp01(1 - v / REACH);
    const coolAlpha = COOL_STRENGTH * clamp01(1 - (1 - v) / REACH);

    for (let x = 0; x < CANVAS; x++) {
      const u = (x + 0.5) / CANVAS;
      const dx = (u - VIGNETTE_CX) / VIGNETTE_RX;
      const dy = (v - VIGNETTE_CY) / VIGNETTE_RY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const vignette =
        VIGNETTE_MAX * clamp01((distance - VIGNETTE_START) / (1 - VIGNETTE_START));

      const source = channels(pixels[y * CANVAS + x]!);
      let hex = '#';
      for (let c = 0; c < 3; c++) {
        let value = source[c]!;
        value = value + warmAlpha * (softLight(value, warm[c]!) - value);
        value = value + coolAlpha * (softLight(value, cool[c]!) - value);
        hex += byte(value * (1 - vignette));
      }
      out[y * CANVAS + x] = hex;
    }
  }

  return out;
}
