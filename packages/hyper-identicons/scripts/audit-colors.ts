/**
 * Prints every contrast the palette has to survive, and flags the ones it does
 * not. Dev-only. The same thresholds are asserted by the test suite; this script
 * is the readable version, for when one of them fails and you need to see why.
 *
 *   pnpm tsx scripts/audit-colors.ts
 *
 * Three audits, because a palette can pass one and fail another:
 *
 *   - External: fur against background, which decides whether the cat reads as a
 *     shape. Only opposite-tone pairs are checked, because those are the only
 *     ones the generator can produce.
 *   - Internal: fur against the lines drawn on it, which decides whether the cat
 *     has a face. Judged on lightness difference rather than WCAG ratio: on a
 *     dark cat the ratio collapses towards 1 while the pixels stay perfectly
 *     distinguishable, which is WCAG 2.x's well-known dark-end flare problem.
 *   - Worn: clothing and headwear against both background tones. Not yet part of
 *     the guarantee, and reported so the gap stays visible.
 */
import { COLORWAYS } from '../src/art/colorways.js';
import { apca, contrast, lightness, chroma, hue, separation } from './color.js';
import type { Tone } from '../src/core/types.js';

/** WCAG's floor for graphical objects, and the lightness gap that goes with it. */
const SHAPE_WCAG = 3;
const SHAPE_DELTA_L = 0.3;
/** APCA's own floor for a solid pictogram, used wherever one shape meets another. */
const SHAPE_LC = 30;
const DETAIL_LC = 30;
/**
 * A garment against the fur is a soft floor, not a guarantee. It is an internal
 * boundary rather than a silhouette, the garment is already pinned between the
 * background and the fur with little room left, and the two are always far apart
 * in hue, which carries the edge where lightness alone would not.
 */
const WORN_ON_FUR_DELTA_L = 0.12;

const pad = (s: string, n: number) => s.padEnd(n);
const band = (t: Tone | undefined) => (t === 'deep' ? 'deep  ' : t === 'bright' ? 'bright' : '?     ');
const flipTone = (t: Tone): Tone => (t === 'deep' ? 'bright' : 'deep');

let failures = 0;
const fail = (why: string) => {
  failures++;
  return why;
};

console.log('BACKGROUNDS\n');
for (const bg of COLORWAYS.background) {
  const a = bg.colors.a!;
  console.log(
    `  ${band(bg.tone)} ${pad(bg.name, 9)} ${a}  L ${lightness(a).toFixed(3)}  C ${chroma(a).toFixed(3)}` +
      `  H ${hue(a).toFixed(0).padStart(3)}   field/pattern ${contrast(a, bg.colors.b!).toFixed(2)}:1`,
  );
}

console.log('\nFUR\n');
for (const body of COLORWAYS.body) {
  const f = body.colors.f!;
  console.log(
    `  ${band(body.tone)} ${pad(body.name, 9)} ${f}  L ${lightness(f).toFixed(3)}  C ${chroma(f).toFixed(3)}` +
      `  H ${hue(f).toFixed(0).padStart(3)}`,
  );
}

const bandRange = (values: number[]) => `${Math.min(...values).toFixed(3)} - ${Math.max(...values).toFixed(3)}`;
const lit = (list: Colorwayish[], tone: Tone, slot: 'a' | 'f') =>
  list.filter((c) => c.tone === tone).map((c) => lightness(c.colors[slot]!));
type Colorwayish = (typeof COLORWAYS)['body'][number];

console.log('\nBANDS\n');
console.log(`  background deep    L ${bandRange(lit(COLORWAYS.background, 'deep', 'a'))}`);
console.log(`  background bright  L ${bandRange(lit(COLORWAYS.background, 'bright', 'a'))}`);
console.log(`  fur deep           L ${bandRange(lit(COLORWAYS.body, 'deep', 'f'))}`);
console.log(`  fur bright         L ${bandRange(lit(COLORWAYS.body, 'bright', 'f'))}`);

console.log('\nEXTERNAL  fur against every background it can land on   (wcag / deltaL)\n');
let worstShape = { pair: '', ratio: Infinity, delta: Infinity };
for (const body of COLORWAYS.body) {
  const opposite = COLORWAYS.background.filter((bg) => bg.tone !== body.tone);
  process.stdout.write(`  ${band(body.tone)} ${pad(body.name, 9)}`);
  for (const bg of opposite) {
    const ratio = contrast(body.colors.f!, bg.colors.a!);
    const delta = separation(body.colors.f!, bg.colors.a!);
    const ok = ratio >= SHAPE_WCAG && delta >= SHAPE_DELTA_L;
    if (!ok) fail('');
    if (ratio < worstShape.ratio) worstShape = { pair: `${body.name} on ${bg.name}`, ratio, delta };
    process.stdout.write(pad(`${ok ? ' ' : '!'}${ratio.toFixed(1)}/${delta.toFixed(2)}`, 11));
  }
  console.log();
}
console.log(
  `\n  worst: ${worstShape.pair} at ${worstShape.ratio.toFixed(2)}:1, deltaL ${worstShape.delta.toFixed(2)}`,
);

console.log('\nDRAWN ON THE FUR  whiskers, inner ear and mouth   (APCA Lc; 30 is the floor)\n');
console.log(`  ${pad('', 17)}${pad('whiskers', 12)}${pad('inner ear', 12)}${pad('mouth, worst', 14)}`);
let worstDetail = { pair: '', lc: Infinity };
for (const body of COLORWAYS.body) {
  const f = body.colors.f!;
  process.stdout.write(`  ${band(body.tone)} ${pad(body.name, 9)}`);
  const cells: [string, number][] = [
    ['s', apca(body.colors.s!, f)],
    ['p', apca(body.colors.p!, f)],
    // The mouth takes the tone opposite the cat's, so those are the only ones it meets.
    ['mouth', Math.min(...COLORWAYS.mouth.filter((m) => m.tone !== body.tone).map((m) => apca(m.colors.o!, f)))],
  ];
  for (const [slot, lc] of cells) {
    if (lc < DETAIL_LC) fail('');
    if (lc < worstDetail.lc) worstDetail = { pair: `${body.name} ${slot}`, lc };
    process.stdout.write(pad(`${lc < DETAIL_LC ? '!' : ' '}${lc.toFixed(1)}`, slot === 'p' ? 12 : 12));
  }
  console.log();
}
console.log(`\n  worst: ${worstDetail.pair} at Lc ${worstDetail.lc.toFixed(1)}`);

console.log('\nTHE INK LINE  measured against the background, which is what it borders\n');
console.log('  On a bright cat it merges into the deep field and the fur carries the');
console.log('  silhouette; on a deep cat it is the silhouette. Only the latter is a claim.\n');
for (const body of COLORWAYS.body) {
  const fields = COLORWAYS.background.filter((bg) => bg.tone !== body.tone);
  const worst = Math.min(...fields.map((bg) => apca(body.colors.o!, bg.colors.a!)));
  const vsFur = apca(body.colors.o!, body.colors.f!);
  if (body.tone === 'deep' && worst < SHAPE_LC) fail('');
  console.log(
    `  ${band(body.tone)} ${pad(body.name, 9)} vs field ${pad(worst.toFixed(1), 8)} vs fur ${vsFur.toFixed(1)}`,
  );
}

console.log('\nWORN  garments against the field behind them, and the fur they sit on\n');
console.log(
  `  ${pad('', 21)}${pad('worst vs background', 22)}${pad('worst vs fur', 16)}` + '(deltaL; fur is a soft floor)',
);
for (const layer of ['clothing', 'headwear'] as const) {
  for (const cw of COLORWAYS[layer]) {
    const a = cw.colors.a!;
    // A garment takes the cat's tone, so it meets the opposite background and the
    // same-tone fur. Those are the only two neighbours it can actually have.
    const fields = lit(COLORWAYS.background, flipTone(cw.tone!), 'a');
    const furs = lit(COLORWAYS.body, cw.tone!, 'f');
    const vsField = Math.min(...fields.map((l) => Math.abs(lightness(a) - l)));
    const vsFur = Math.min(...furs.map((l) => Math.abs(lightness(a) - l)));
    if (vsField < SHAPE_DELTA_L) fail('');
    if (vsFur < WORN_ON_FUR_DELTA_L) fail('');
    console.log(
      `  ${band(cw.tone)} ${pad(layer, 9)} ${pad(cw.name, 10)} ${a}  L ${lightness(a).toFixed(2)}` +
        `   ${vsField < SHAPE_DELTA_L ? '!' : ' '}${vsField.toFixed(2)}` +
        `             ${vsFur < WORN_ON_FUR_DELTA_L ? '!' : ' '}${vsFur.toFixed(2)}`,
    );
  }
}

console.log(`\n${failures} failing pair${failures === 1 ? '' : 's'} in the guaranteed set`);
