/**
 * Renders the base Purrbit — the cat every other trait is drawn on top of — to a PNG
 * at the repository root, through the shipped pipeline rather than the Python preview.
 * Regenerate it whenever the body art changes. Dev-only: never ships.
 *
 *   pnpm tsx scripts/render-base.ts [scale] [out.png]
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { renderPixels } from '../src/core/render.js';
import { CANVAS } from '../src/core/slots.js';
import type { LayerChoice, LayerId } from '../src/core/types.js';
import { encodePng, hex } from './png.js';

// No clothing, headwear or accessory: those are the things being applied to it.
const WANTED: Partial<Record<LayerId, [art: string, colorway: string]>> = {
  background: ['plain', 'sand'],
  body: ['base', 'snow'],
  mouth: ['smile', 'coal'],
  eyes: ['round', 'coal'],
};

const choices: LayerChoice[] = Object.entries(WANTED).map(([layer, [artId, colorwayId]]) => {
  const spec = MANIFEST[layer as LayerId];
  const art = spec.art.find((entry) => entry.id === artId);
  const colorway = spec.colorways.find((entry) => entry.id === colorwayId);
  if (!art) throw new Error(`${layer}: no art '${artId}'`);
  if (!colorway) throw new Error(`${layer}: no colourway '${colorwayId}'`);
  return { layer: layer as LayerId, art, colorway };
});

const scale = Number(process.argv[2] ?? 20);
// Resolved against the script, not the shell, so the file lands in the root either way.
const out = process.argv[3] ?? fileURLToPath(new URL('../../../base-purrbit.png', import.meta.url));

const pixels = renderPixels(choices, ART_DATA);
const size = CANVAS * scale;
const rgb = new Uint8Array(size * size * 3);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const color = pixels[Math.floor(y / scale) * CANVAS + Math.floor(x / scale)]!;
    const offset = (y * size + x) * 3;
    rgb[offset] = hex(color, 0);
    rgb[offset + 1] = hex(color, 1);
    rgb[offset + 2] = hex(color, 2);
  }
}

writeFileSync(out, encodePng(size, size, rgb));
console.log(`${out}  ${size}x${size}  ${choices.map((c) => `${c.layer}=${c.art.id}/${c.colorway.id}`).join(' ')}`);
