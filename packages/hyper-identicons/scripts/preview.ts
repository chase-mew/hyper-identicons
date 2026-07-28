/**
 * Renders a contact sheet of identicons to PNG so the art can be judged at the sizes
 * it will actually be seen at. Dev-only: never ships.
 *
 *   pnpm tsx scripts/preview.ts [count] [scale] [full|mini] [out.png]
 */
import { writeFileSync } from 'node:fs';
import { keccak_256 } from '@noble/hashes/sha3';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { MINI_ART_DATA } from '../src/mini.js';
import { generate } from '../src/core/index.js';
import { CANVAS } from '../src/core/slots.js';
import { treatPixels } from '../src/core/treatment.js';
import type { DetailLevel } from '../src/core/types.js';
import { encodePng, hex } from './png.js';

const count = Number(process.argv[2] ?? 64);
const scale = Number(process.argv[3] ?? 4);
const detail = (process.argv[4] ?? 'full') as DetailLevel;
const outPath = process.argv[5] ?? `preview-${detail}-${scale}x.png`;

const columns = Math.ceil(Math.sqrt(count));
const rows = Math.ceil(count / columns);
const gap = Math.max(1, Math.round(scale / 2));
const cell = CANVAS * scale + gap;
const width = columns * cell + gap;
const height = rows * cell + gap;
const rgb = new Uint8Array(width * height * 3).fill(0x18);

// Deterministic sample addresses so the sheet is comparable between runs.
for (let index = 0; index < count; index++) {
  const address = `0x${Buffer.from(keccak_256(`sample/${index}`)).toString('hex').slice(0, 40)}`;
  const pixels = treatPixels(generate(address, MANIFEST, detail === 'mini' ? MINI_ART_DATA : ART_DATA, detail).pixels);
  const originX = gap + (index % columns) * cell;
  const originY = gap + Math.floor(index / columns) * cell;

  for (let y = 0; y < CANVAS * scale; y++) {
    for (let x = 0; x < CANVAS * scale; x++) {
      const color = pixels[Math.floor(y / scale) * CANVAS + Math.floor(x / scale)]!;
      const offset = ((originY + y) * width + originX + x) * 3;
      rgb[offset] = hex(color, 0);
      rgb[offset + 1] = hex(color, 1);
      rgb[offset + 2] = hex(color, 2);
    }
  }
}

writeFileSync(outPath, encodePng(width, height, rgb));
console.log(`${outPath}  ${width}x${height}  ${count} identicons at ${CANVAS * scale}px (${detail})`);
