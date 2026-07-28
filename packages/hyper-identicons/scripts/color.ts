/**
 * Colour maths for auditing the palette. Dev-only: the library ships flat hex
 * strings and never computes anything, but the palette has to be checked against
 * numbers rather than taste, and the check has to be runnable in CI.
 *
 * Two measures, because they answer different questions:
 *
 *   - WCAG 2.x contrast ratio, for "can these two be told apart at all". It is
 *     the industry floor (3:1 for graphical objects) and the one people will
 *     quote at us, but it is badly behaved at the dark end -- its 0.05 flare
 *     term means two near-blacks score far better than they look.
 *   - OKLab lightness difference, for "does one read as lighter than the other".
 *     Perceptually uniform, so a gap of 0.20 means the same thing at the bottom
 *     of the range as at the top. This is the one that actually predicts whether
 *     a flat silhouette separates from a flat background.
 *
 * A pair has to clear both. WCAG alone passes dark-on-dark; OKLab alone passes
 * pairs that differ in lightness but are muddy.
 */

const channel = (hex: string, index: number) => Number.parseInt(hex.slice(1 + index * 2, 3 + index * 2), 16) / 255;

/** sRGB transfer function, undone. */
const linearise = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

function linearRgb(hex: string): [number, number, number] {
  return [linearise(channel(hex, 0)), linearise(channel(hex, 1)), linearise(channel(hex, 2))];
}

/** OKLab lightness, 0 (black) to 1 (white). Björn Ottosson's matrices. */
export function lightness(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
}

/** OKLab chroma. Only used to keep an eye on how saturated the palette drifts. */
export function chroma(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(a, bb);
}

/** OKLab hue in degrees, 0-360. */
export function hue(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
}

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = linearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

/** Perceptual lightness gap, 0 to 1. */
export const separation = (a: string, b: string) => Math.abs(lightness(a) - lightness(b));

/**
 * APCA Lc, version 0.1.9 (0.98G-4g), magnitude only.
 *
 * The third opinion, and the one that settles arguments between the other two.
 * WCAG overstates contrast near black; OKLab lightness understates the effect of
 * chroma, since two colours at the same L can differ in luminance by about 1.4x.
 * APCA is the one built to predict whether a thing is actually visible, and its
 * `0.022` soft clamp is an explicit fix for the dark end.
 *
 * Read it as: below 15 is invisible, 30 is APCA's own floor for a solid
 * pictogram, 45 is roughly a well-behaved 3:1, 60 is body-text grade.
 *
 * Note the plain 2.4 exponent -- APCA deliberately does not use the piecewise
 * sRGB curve that `linearise` above implements.
 */
export function apca(text: string, background: string): number {
  const y = (hex: string) => {
    const v = (i: number) => (Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255) ** 2.4;
    const raw = 0.2126729 * v(0) + 0.7151522 * v(1) + 0.072175 * v(2);
    return raw < 0.022 ? raw + (0.022 - raw) ** 1.414 : raw;
  };
  const [txt, bg] = [y(text), y(background)];
  if (Math.abs(bg - txt) < 0.0005) return 0;
  if (bg > txt) {
    const s = (bg ** 0.56 - txt ** 0.57) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (bg ** 0.65 - txt ** 0.62) * 1.14;
  return s > -0.1 ? 0 : Math.abs((s + 0.027) * 100);
}

const gamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    gamma(+4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * OKLCH to the nearest in-gamut sRGB hex, reducing chroma until it fits.
 *
 * Used to design the palette rather than to render it: picking a colour by
 * lightness first is the whole point of the tone bands, and eyeballing hex is
 * how the palette ended up unbalanced in the first place. The blue and violet
 * hues run out of gamut far sooner than yellow or cyan at the same lightness,
 * so asking for more chroma than a hue can hold and letting it clamp is normal.
 */
export function fromOklch(L: number, C: number, H: number): string {
  const rad = (H * Math.PI) / 180;
  let lo = 0;
  let hi = C;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const rgb = oklabToRgb(L, mid * Math.cos(rad), mid * Math.sin(rad));
    if (rgb.every((v) => v >= -0.0001 && v <= 1.0001)) lo = mid;
    else hi = mid;
  }
  const rgb = oklabToRgb(L, lo * Math.cos(rad), lo * Math.sin(rad));
  return `#${rgb.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
