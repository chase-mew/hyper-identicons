/**
 * Renders one PNG per trait, through the shipping pipeline, so the art can be
 * judged as it will actually appear rather than in a debug palette. Dev-only.
 *
 *   pnpm tsx scripts/trait-shots.ts [layer]
 *
 * Each trait is drawn over the same cat twice, once on a deep field and once on a
 * bright one, because a hat that reads beautifully on one can vanish on the other.
 * A 48px copy sits alongside: nearly every mistake in this art is a thing that
 * looks fine at 8x and turns to mush at wallet size.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { renderPixels } from '../src/core/render.js';
import { CANVAS } from '../src/core/slots.js';
import { treatPixels } from '../src/core/treatment.js';
import type { LayerChoice, LayerId, Tone } from '../src/core/types.js';
import { LAYER_ORDER } from '../src/core/types.js';
import { encodePng, hex } from './png.js';

const only = process.argv[2] as LayerId | undefined;
const OUT = 'tools/out/traits';
const BIG = 8;

/** The cat everything is judged against: one fur per tone, plain field, neutral face. */
function scene(tone: Tone, layer: LayerId, artId: string): LayerChoice[] {
  const garment = tone === 'deep' ? 'navy' : 'cobalt';
  const picks: Partial<Record<LayerId, [string, string]>> = {
    background: ['plain', tone === 'deep' ? 'foam' : 'ebony'],
    body: ['base', tone === 'deep' ? 'void' : 'cream'],
    clothing: ['tee', garment],
    mouth: ['neutral', tone === 'deep' ? 'chalk' : 'coal'],
    eyes: ['round', 'coal'],
    accessory: ['none', tone === 'deep' ? 'chrome' : 'noir'],
    headwear: ['none', garment],
  };
  picks[layer] = [artId, picks[layer]![1]];

  return LAYER_ORDER.map((id) => {
    const [a, c] = picks[id]!;
    const art = MANIFEST[id].art.find((x) => x.id === a);
    const colorway = MANIFEST[id].colorways.find((x) => x.id === c);
    if (!art || !colorway) throw new Error(`${id}: no art '${a}' or colourway '${c}'`);
    return { layer: id, art, colorway };
  });
}

function draw(choices: LayerChoice[], scale: number, into: Uint8Array, width: number, ox: number, oy: number) {
  const pixels = treatPixels(renderPixels(choices, ART_DATA));
  for (let y = 0; y < CANVAS * scale; y++) {
    for (let x = 0; x < CANVAS * scale; x++) {
      const color = pixels[Math.floor(y / scale) * CANVAS + Math.floor(x / scale)]!;
      const o = ((oy + y) * width + ox + x) * 3;
      into[o] = hex(color, 0);
      into[o + 1] = hex(color, 1);
      into[o + 2] = hex(color, 2);
    }
  }
}

if (!only) rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const big = CANVAS * BIG;
const width = big * 2 + CANVAS + 12;

let n = 0;
for (const id of LAYER_ORDER) {
  if (id === 'body' || (only && id !== only)) continue;
  for (const art of MANIFEST[id].art) {
    const rgb = new Uint8Array(width * big * 3).fill(0x60);
    draw(scene('deep', id, art.id), BIG, rgb, width, 0, 0);
    draw(scene('bright', id, art.id), BIG, rgb, width, big + 4, 0);
    draw(scene('deep', id, art.id), 1, rgb, width, big * 2 + 8, 0);
    draw(scene('bright', id, art.id), 1, rgb, width, big * 2 + 8, CANVAS + 4);
    writeFileSync(`${OUT}/${id}-${art.id}.png`, encodePng(width, big, rgb));
    n++;
  }
}
console.log(`${n} trait shots in ${OUT}`);
