/**
 * Every art of one layer against every art of another, on one cat, as a grid.
 * Dev-only.
 *
 *   pnpm tsx scripts/pairs.ts <rowLayer> <columnLayer> [layer=art ...] [--deep]
 *
 *   pnpm tsx scripts/pairs.ts eyes mouth                    # expressions
 *   pnpm tsx scripts/pairs.ts eyes mouth accessory=eyepatch # through a patch
 *   pnpm tsx scripts/pairs.ts headwear accessory            # hats over eyewear
 *   pnpm tsx scripts/pairs.ts headwear clothing --deep      # on a dark cat
 *
 * The trait sheets judge one trait at a time against a neutral cat, which is the
 * right way to see whether a trait is drawn well and no way at all to see whether
 * two of them can be worn together. Some readings are properties of the pair and
 * of nothing else — an expression is not a property of a mouth, a silhouette is
 * not a property of a hat — and the selector draws every layer independently, so
 * laying the product out and looking at it is the only way to know what the set
 * contains.
 *
 * The third argument fixes some other layer, for the cases where a pair is only
 * bad through a third thing. Pairs the manifest already excludes are drawn anyway
 * and struck through: the question the grid answers is what a pair looks like, and
 * that is still worth seeing once the selector has been told to stop producing it.
 * The mark is what stops a later session finding a bad pair and fixing it twice.
 */
import { writeFileSync } from 'node:fs';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/art/full.js';
import { renderPixels } from '../src/core/render.js';
import { CANVAS } from '../src/core/slots.js';
import { treatPixels } from '../src/core/treatment.js';
import type { LayerChoice, LayerId } from '../src/core/types.js';
import { LAYER_ORDER } from '../src/core/types.js';
import { encodePng, hex } from './png.js';

const args = process.argv.slice(2);
const deep = args.includes('--deep');
const positional = args.filter((a) => !a.includes('=') && a !== '--deep');

function layerArg(value: string | undefined): LayerId {
  if (value === undefined || !Object.hasOwn(MANIFEST, value)) {
    throw new Error(`usage: pairs.ts <rowLayer> <columnLayer> [layer=art ...] [--deep]  (${LAYER_ORDER.join(' ')})`);
  }
  return value as LayerId;
}

const rowLayer = layerArg(positional[0]);
const columnLayer = layerArg(positional[1]);

const fixed = new Map(
  args.filter((a) => a.includes('=')).map((a) => a.split('=') as [LayerId, string]),
);

const SCALE = 4;
const GAP = 4;

/** The cat everything is judged on: whatever is not being varied stays neutral. */
function cat(rowArt: string, columnArt: string): LayerChoice[] {
  const picks: Record<LayerId, [string, string]> = {
    background: ['plain', deep ? 'foam' : 'ebony'],
    body: ['base', deep ? 'void' : 'cream'],
    clothing: ['tee', deep ? 'navy' : 'cobalt'],
    mouth: ['neutral', deep ? 'chalk' : 'coal'],
    eyes: ['round', 'coal'],
    accessory: ['none', deep ? 'chrome' : 'noir'],
    headwear: ['none', deep ? 'navy' : 'cobalt'],
  };
  for (const [layer, art] of fixed) picks[layer] = [art, picks[layer][1]];
  picks[rowLayer] = [rowArt, picks[rowLayer][1]];
  picks[columnLayer] = [columnArt, picks[columnLayer][1]];

  return LAYER_ORDER.map((id) => {
    const [a, c] = picks[id];
    const art = MANIFEST[id].art.find((x) => x.id === a);
    const colorway = MANIFEST[id].colorways.find((x) => x.id === c);
    if (!art || !colorway) throw new Error(`${id}: no art '${a}' or colourway '${c}'`);
    return { layer: id, art, colorway };
  });
}

const rows = MANIFEST[rowLayer].art;
const columns = MANIFEST[columnLayer].art;
const tile = CANVAS * SCALE;
const width = columns.length * (tile + GAP) + GAP;
const height = rows.length * (tile + GAP + CANVAS + GAP) + GAP;
const rgb = new Uint8Array(width * height * 3).fill(0x20);

function draw(choices: LayerChoice[], scale: number, ox: number, oy: number) {
  const pixels = treatPixels(renderPixels(choices, ART_DATA));
  for (let y = 0; y < CANVAS * scale; y++) {
    for (let x = 0; x < CANVAS * scale; x++) {
      const color = pixels[Math.floor(y / scale) * CANVAS + Math.floor(x / scale)]!;
      const o = ((oy + y) * width + ox + x) * 3;
      rgb[o] = hex(color, 0);
      rgb[o + 1] = hex(color, 1);
      rgb[o + 2] = hex(color, 2);
    }
  }
}

/** Whether the selector would refuse this cat, so the grid can say so. */
const excluded = (choices: LayerChoice[]) =>
  choices.some((choice) =>
    choice.art.excludes?.some((pair) => choices.some((other) => other.layer === pair.layer && other.art.id === pair.art)),
  );

function strike(ox: number, oy: number) {
  for (let y = tile / 2 - 2; y < tile / 2 + 2; y++) {
    for (let x = 0; x < tile; x++) {
      const o = ((oy + y) * width + ox + x) * 3;
      rgb[o] = 0xe0;
      rgb[o + 1] = 0x30;
      rgb[o + 2] = 0x30;
    }
  }
}

rows.forEach((row, y) => {
  columns.forEach((column, x) => {
    const ox = GAP + x * (tile + GAP);
    const oy = GAP + y * (tile + GAP + CANVAS + GAP);
    const choices = cat(row.id, column.id);
    draw(choices, SCALE, ox, oy);
    // Native size directly beneath, because a pair that only works at 4x is not a
    // pair this sprite can wear.
    draw(choices, 1, ox + (tile - CANVAS) / 2, oy + tile + GAP);
    if (excluded(choices)) strike(ox, oy);
  });
});

const tag = [rowLayer, columnLayer, ...[...fixed].map(([l, a]) => `${l}-${a}`), deep ? 'deep' : '']
  .filter(Boolean)
  .join('-');
const out = `tools/out/pairs-${tag}.png`;
writeFileSync(out, encodePng(width, height, rgb));
console.log(`${out}   rows ${rows.map((r) => r.id).join(', ')}   columns ${columns.map((c) => c.id).join(', ')}`);
