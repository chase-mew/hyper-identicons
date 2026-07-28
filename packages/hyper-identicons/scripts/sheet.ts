/**
 * Renders a wall of identicons from arbitrary addresses. Dev-only.
 *
 *   pnpm tsx scripts/sheet.ts [columns] [rows]
 *
 * Reviewing traits one at a time hides the thing that actually matters, which is
 * whether forty of these side by side look like one family and still tell each
 * other apart. Half the sheet is drawn at wallet size for the same reason.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { identiconOf } from '../src/index.js';
import { CANVAS } from '../src/core/slots.js';
import { encodePng, hex } from './png.js';

const COLS = Number(process.argv[2] ?? 8);
const ROWS = Number(process.argv[3] ?? 5);
const SCALE = 4;
const PAD = 3;
const CELL = CANVAS * SCALE + PAD * 2;
const STRIP = CANVAS + PAD * 2;

const width = COLS * CELL;
const height = ROWS * CELL + STRIP;
const rgb = new Uint8Array(width * height * 3).fill(0x30);

function blit(pixels: string[], scale: number, ox: number, oy: number) {
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

for (let i = 0; i < COLS * ROWS; i++) {
  let seed = (i + 1) * 2654435761;
  const address = `0x${[...Array(40)]
    .map(() => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822519)) >>> 28).toString(16))
    .join('')}`;
  const { pixels } = identiconOf(address);
  blit(pixels, SCALE, (i % COLS) * CELL + PAD, Math.floor(i / COLS) * CELL + PAD);
  if (i < COLS * SCALE) blit(pixels, 1, (i % (COLS * SCALE)) * STRIP + PAD, ROWS * CELL + PAD);
}

mkdirSync('tools/out', { recursive: true });
writeFileSync('tools/out/sheet.png', encodePng(width, height, rgb));
console.log(`${COLS * ROWS} identicons in tools/out/sheet.png`);
