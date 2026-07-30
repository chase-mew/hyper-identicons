/**
 * Where the palette has room to move, given the thresholds it has to keep.
 *
 * The bands are coupled: every deep colour is bounded above by a bright one, so
 * "can this be brighter" is never a question about one swatch. This solves the
 * bounds rather than leaving them to be rediscovered by trial and error.
 *
 *   pnpm tsx scripts/headroom.ts
 */
import { COLORWAYS } from '../src/art/colorways.js';
import { chroma, contrast, fromOklch, hue, lightness } from './color.js';
import type { Tone } from '../src/core/types.js';

const SHAPE_DELTA_L = 0.3;
const SHAPE_WCAG = 3;
const WORN_ON_FUR_DELTA_L = 0.12;

const pad = (s: string, n: number) => s.padEnd(n);
const lit = (layer: 'background' | 'body' | 'clothing' | 'headwear', tone: Tone, slot: 'a' | 'f') =>
  COLORWAYS[layer].filter((c) => c.tone === tone).map((c) => lightness(c.colors[slot]!));

const bgDeep = lit('background', 'deep', 'a');
const bgBright = lit('background', 'bright', 'a');
const furDeep = lit('body', 'deep', 'f');
const furBright = lit('body', 'bright', 'f');
const garDeep = [...lit('clothing', 'deep', 'a'), ...lit('headwear', 'deep', 'a')];
const garBright = [...lit('clothing', 'bright', 'a'), ...lit('headwear', 'bright', 'a')];

const show = (name: string, v: number[]) =>
  console.log(`  ${pad(name, 18)} L ${Math.min(...v).toFixed(3)} - ${Math.max(...v).toFixed(3)}`);

console.log('CURRENT BANDS\n');
show('background deep', bgDeep);
show('background bright', bgBright);
show('fur deep', furDeep);
show('fur bright', furBright);
show('garment deep', garDeep);
show('garment bright', garBright);

console.log('\nCEILINGS  how bright each deep band could go without moving anything else\n');
// A deep background only ever sits behind a bright cat, so it is bounded by the
// dimmest bright thing that can be drawn on top of it: fur, or a garment.
const bgDeepCeil = Math.min(Math.min(...furBright), Math.min(...garBright)) - SHAPE_DELTA_L;
// A deep garment meets bright fields behind it and deep fur underneath it.
const garDeepCeil = Math.min(Math.min(...bgBright) - SHAPE_DELTA_L, Math.min(...furDeep) - WORN_ON_FUR_DELTA_L);
// Deep fur meets bright fields. Both thresholds bite here and the WCAG one bites
// first, which the lightness arithmetic on its own would hide: a fur can clear
// 0.30 against every bright field and still be under 3:1 against the palest of
// them, because the ratio is a luminance question and the gap is not.
const furDeepCeil = Math.min(Math.min(...bgBright) - SHAPE_DELTA_L, wcagCeiling());

/**
 * The lightest a deep fur can be before it drops under 3:1 against some bright
 * field. Solved by bisection on the worst-case hue rather than in closed form,
 * since the ratio depends on chroma as well as lightness.
 */
function wcagCeiling(): number {
  const fields = COLORWAYS.background.filter((bg) => bg.tone === 'bright').map((bg) => bg.colors.a!);
  const worst = (L: number) =>
    Math.min(
      ...COLORWAYS.body
        .filter((b) => b.tone === 'deep')
        .flatMap((b) => fields.map((f) => contrast(fromOklch(L, chroma(b.colors.f!), hue(b.colors.f!)), f))),
    );
  let lo = 0.3;
  let hi = 0.75;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (worst(mid) >= SHAPE_WCAG) lo = mid;
    else hi = mid;
  }
  return lo;
}

const gap = (now: number, ceil: number) => `${(ceil - now).toFixed(3)}`;
console.log(`  background deep    now ${Math.max(...bgDeep).toFixed(3)}  ceiling ${bgDeepCeil.toFixed(3)}  room ${gap(Math.max(...bgDeep), bgDeepCeil)}`);
console.log(`     bounded by       dimmest bright fur ${Math.min(...furBright).toFixed(3)}, dimmest bright garment ${Math.min(...garBright).toFixed(3)}`);
console.log(`  garment deep       now ${Math.max(...garDeep).toFixed(3)}  ceiling ${garDeepCeil.toFixed(3)}  room ${gap(Math.max(...garDeep), garDeepCeil)}`);
console.log(`     bounded by       dimmest bright field ${Math.min(...bgBright).toFixed(3)}, dimmest deep fur ${Math.min(...furDeep).toFixed(3)}`);
console.log(`  fur deep           now ${Math.max(...furDeep).toFixed(3)}  ceiling ${furDeepCeil.toFixed(3)}  room ${gap(Math.max(...furDeep), furDeepCeil)}`);
console.log(`     bounded by       3:1 against the palest bright field, at ${wcagCeiling().toFixed(3)}`);

console.log('\nCHROMA  the other axis, and the one no threshold constrains\n');
console.log('  Dullness is mostly this rather than lightness. The cusp column is the most');
console.log('  chroma sRGB can hold at that lightness and hue, so it is the hard ceiling.\n');
console.log(`  ${pad('', 23)}${pad('hex', 10)}${pad('L', 8)}${pad('C', 8)}${pad('H', 6)}cusp at its L`);
for (const [layer, tone, slot] of [
  ['background', 'deep', 'a'],
  ['background', 'deep', 'b'],
  ['clothing', 'deep', 'a'],
  ['headwear', 'deep', 'a'],
  ['body', 'deep', 'f'],
] as const) {
  for (const cw of COLORWAYS[layer].filter((c) => c.tone === tone)) {
    const c = cw.colors[slot]!;
    const [L, C, H] = [lightness(c), chroma(c), hue(c)];
    console.log(
      `  ${pad(`${layer}.${slot}`, 14)} ${pad(cw.name, 10)} ${c}  ${pad(L.toFixed(3), 8)}${pad(C.toFixed(3), 8)}` +
        `${pad(H.toFixed(0), 6)}${cusp(L, H).toFixed(3)}`,
    );
  }
}

/** The most chroma sRGB holds at this lightness and hue. fromOklch clamps to it. */
function cusp(L: number, H: number): number {
  return chroma(fromOklch(L, 0.4, H));
}

console.log('\nCUSP BY HUE  what is available if the deep bands move up\n');
const hues = [25, 45, 152, 172, 188, 195, 250, 257, 264, 290, 318, 336];
console.log(`  ${pad('L', 8)}${hues.map((h) => pad(`h${h}`, 7)).join('')}`);
for (const L of [0.3, 0.32, 0.34, 0.36, 0.38]) {
  console.log(`  ${pad(L.toFixed(2), 8)}${hues.map((h) => pad(cusp(L, h).toFixed(3), 7)).join('')}`);
}
