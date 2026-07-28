/**
 * A minimal PNG writer for the dev scripts, so previews can be looked at as files.
 * Truecolour, no alpha, no filtering. Dev-only: uses node:zlib and never ships.
 */
import { deflateSync } from 'node:zlib';

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

export function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
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

/** Splits '#rrggbb' into its three bytes. */
export const hex = (color: string, index: number) => Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16);
