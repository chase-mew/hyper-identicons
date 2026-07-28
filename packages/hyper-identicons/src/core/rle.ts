import { CANVAS } from './slots.js';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

// Hand-rolled rather than atob/btoa: React Native's Hermes runtime ships neither,
// and wallets are the primary consumer.
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? '=' : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? '=' : B64[c & 63];
  }
  return out;
}

export function fromBase64(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const bytes = new Uint8Array((clean.length * 3) >> 2);
  let acc = 0;
  let bits = 0;
  let index = 0;
  for (const char of clean) {
    const value = B64.indexOf(char);
    if (value < 0) throw new Error(`Invalid base64 character: ${char}`);
    acc = (acc << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (acc >> bits) & 0xff;
    }
  }
  return bytes;
}

export interface DecodedArt {
  top: number;
  left: number;
  height: number;
  width: number;
  /** height * width slot indices, row-major within the bounding box. */
  slots: Uint8Array;
}

/** Format: top, left, height, width, then (runLength, slot) pairs. See spec/v1.md §4.3. */
export function encodeRle(slots: Uint8Array, top: number, left: number, height: number, width: number): string {
  const expected = height * width;
  if (slots.length !== expected) {
    throw new Error(`Expected ${expected} pixels for ${width}x${height}, got ${slots.length}`);
  }
  const bytes: number[] = [top, left, height, width];
  let runStart = 0;
  while (runStart < slots.length) {
    const slot = slots[runStart]!;
    let runEnd = runStart + 1;
    while (runEnd < slots.length && slots[runEnd] === slot && runEnd - runStart < 255) runEnd++;
    bytes.push(runEnd - runStart, slot);
    runStart = runEnd;
  }
  return toBase64(Uint8Array.from(bytes));
}

export function decodeRle(data: string): DecodedArt {
  const bytes = fromBase64(data);
  const top = bytes[0]!;
  const left = bytes[1]!;
  const height = bytes[2]!;
  const width = bytes[3]!;
  if (top + height > CANVAS || left + width > CANVAS) {
    throw new Error(`Bounding box ${width}x${height} at ${left},${top} escapes the ${CANVAS}px canvas`);
  }
  const slots = new Uint8Array(height * width);
  let cursor = 0;
  for (let i = 4; i < bytes.length; i += 2) {
    const run = bytes[i]!;
    const slot = bytes[i + 1]!;
    slots.fill(slot, cursor, cursor + run);
    cursor += run;
  }
  if (cursor !== slots.length) {
    throw new Error(`Run lengths cover ${cursor} pixels, expected ${slots.length}`);
  }
  return { top, left, height, width, slots };
}
