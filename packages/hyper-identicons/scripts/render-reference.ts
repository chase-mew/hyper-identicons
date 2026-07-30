/**
 * Renders the exact trait combination from the reference image through the shipped
 * pipeline, so the recreation is verified against real encoded art rather than the
 * Python authoring preview.
 *
 *   pnpm tsx scripts/render-reference.ts out.svg
 */
import { writeFileSync } from 'node:fs';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { renderPixels } from '../src/core/render.js';
import { toSvg } from '../src/core/svg.js';
import { LAYER_ORDER } from '../src/core/types.js';
import type { LayerChoice, LayerId } from '../src/core/types.js';

const WANTED: Record<LayerId, [art: string, colorway: string]> = {
  background: ['plain', 'sand'],
  body: ['base', 'snow'],
  clothing: ['hoodie-logo', 'hyper'],
  mouth: ['neutral', 'coal'],
  eyes: ['round', 'coal'],
  accessory: ['shades-thug', 'noir'],
  headwear: ['cap-logo', 'hyper'],
};

const choices: LayerChoice[] = LAYER_ORDER.map((layer) => {
  const [artId, colorwayId] = WANTED[layer];
  const spec = MANIFEST[layer];
  const art = spec.art.find((entry) => entry.id === artId);
  const colorway = spec.colorways.find((entry) => entry.id === colorwayId);
  if (!art) throw new Error(`${layer}: no art '${artId}'`);
  if (!colorway) throw new Error(`${layer}: no colourway '${colorwayId}'`);
  return { layer, art, colorway };
});

const out = process.argv[2] ?? 'reference.svg';
writeFileSync(out, toSvg(renderPixels(choices, ART_DATA), { size: 512 }));
console.log(`${out}  ${choices.map((c) => `${c.layer}=${c.art.id}/${c.colorway.id}`).join(' ')}`);
