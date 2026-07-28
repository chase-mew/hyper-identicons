/**
 * Renders a contact sheet of identicons to PNG so the art can be judged at the sizes
 * it will actually be seen at. Dev-only: uses node:zlib and never ships.
 *
 *   pnpm tsx scripts/preview.ts [count] [scale] [full|mini] [out.png]
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { keccak_256 } from '@noble/hashes/sha3';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA } from '../src/index.js';
import { MINI_ART_DATA } from '../src/mini.js';
import { generate } from '../src/core/index.js';
import { CANVAS } from '../src/core/slots.js';
import type { DetailLevel } from '../src/core/types.js';

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const body = new Uint8Array(4 + data.length);
  body.set([...type].map((c) => c.charCodeAt(0)), 0);
  body.set(data, 4);
  const out = new Uint8Array(8 + data.length + 4);
  new DataView(out.buffer).setUint32(0, data.length);
  out.set(body, 4);
  new DataView(out.buffer).setUint32(8 + data.length, crc32(body));
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y++) {
    raw[y * (1 + width * 3)] = 0;
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (1 + width * 3) + 1);
  }
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, 2, 0, 0, 0], 8);

  const parts = [
    Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array(0)),
  ];
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

const hex = (color: string, index: number) => Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16);

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
  const { pixels } = generate(address, MANIFEST, detail === 'mini' ? MINI_ART_DATA : ART_DATA, detail);
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
