/**
 * Every mouth against every pair of eyes, on one cat, as a grid. Dev-only.
 *
 *   pnpm tsx scripts/faces.ts [accessory]
 *
 * The trait sheets judge one trait at a time against a neutral face, which is the
 * right way to see whether a trait is drawn well and no way at all to see whether
 * two of them can be worn together. An expression is not a property of the mouth
 * or of the eyes, it is a property of the pair, and the selector draws them from
 * independent lists — so the only way to know what the set actually contains is
 * to lay the whole product out and look at it.
 *
 * Pass an accessory id to see the same grid through it; the ones that cover an
 * eye change every expression underneath them.
 *
 * Pairs the manifest excludes are drawn anyway and struck through, because the
 * question this grid answers is "what does this pair look like" and the answer is
 * still worth seeing after the selector has been told to stop producing it. The
 * marking is what stops a later session rediscovering a bad pair and fixing it
 * twice.
 */
import { writeFileSync } from 'node:fs';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { renderPixels } from '../src/core/render.js';
import { CANVAS } from '../src/core/slots.js';
import { treatPixels } from '../src/core/treatment.js';
import type { LayerChoice, LayerId } from '../src/core/types.js';
import { LAYER_ORDER } from '../src/core/types.js';
import { encodePng, hex } from './png.js';

const accessory = process.argv[2] ?? 'none';
const SCALE = 4;
const GAP = 4;

function face(mouthId: string, eyesId: string): LayerChoice[] {
  const picks: Record<LayerId, [string, string]> = {
    background: ['plain', 'ebony'],
    body: ['base', 'cream'],
    clothing: ['tee', 'cobalt'],
    mouth: [mouthId, 'coal'],
    eyes: [eyesId, 'coal'],
    accessory: [accessory, 'noir'],
    headwear: ['none', 'cobalt'],
  };
  return LAYER_ORDER.map((id) => {
    const [a, c] = picks[id];
    const art = MANIFEST[id].art.find((x) => x.id === a);
    const colorway = MANIFEST[id].colorways.find((x) => x.id === c);
    if (!art || !colorway) throw new Error(`${id}: no art '${a}' or colourway '${c}'`);
    return { layer: id, art, colorway };
  });
}

const mouths = MANIFEST.mouth.art;
const eyes = MANIFEST.eyes.art;
const tile = CANVAS * SCALE;
const width = mouths.length * (tile + GAP) + GAP;
const height = eyes.length * (tile + GAP + CANVAS + GAP) + GAP;
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

/** Whether the selector would refuse this face, so the grid can say so. */
function excluded(choices: LayerChoice[]): boolean {
  return choices.some((choice) =>
    choice.art.excludes?.some((pair) => choices.some((other) => other.layer === pair.layer && other.art.id === pair.art)),
  );
}

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

eyes.forEach((eye, row) => {
  mouths.forEach((mouth, col) => {
    const ox = GAP + col * (tile + GAP);
    const oy = GAP + row * (tile + GAP + CANVAS + GAP);
    const choices = face(mouth.id, eye.id);
    draw(choices, SCALE, ox, oy);
    // Native size directly beneath, because an expression that only works at 4x
    // is not an expression this sprite has.
    draw(choices, 1, ox + (tile - CANVAS) / 2, oy + tile + GAP);
    if (excluded(choices)) strike(ox, oy);
  });
});

const out = `tools/out/faces-${accessory}.png`;
writeFileSync(out, encodePng(width, height, rgb));
console.log(`${out}   rows ${eyes.map((e) => e.id).join(', ')}   columns ${mouths.map((m) => m.id).join(', ')}`);
