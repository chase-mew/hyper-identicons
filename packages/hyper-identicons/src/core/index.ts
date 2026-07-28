import { normalizeAddress } from './address.js';
import { Cursor } from './cursor.js';
import { renderPixels } from './render.js';
import { selectTraits } from './select.js';
import type { ArtData, DetailLevel, Identicon, Manifest } from './types.js';

export function generate(
  address: string,
  manifest: Manifest,
  artData: ArtData,
  detail: DetailLevel = 'full',
): Identicon {
  const normalized = normalizeAddress(address);
  const choices = selectTraits(Cursor.fromAddress(normalized), manifest);
  return { address: normalized, detail, choices, pixels: renderPixels(choices, artData) };
}

export { InvalidAddressError, isAddress, normalizeAddress } from './address.js';
export { Cursor } from './cursor.js';
export { decodeRle, encodeRle, fromBase64, toBase64 } from './rle.js';
export { renderPixels } from './render.js';
export { pick, selectTraits } from './select.js';
export { CANVAS, SLOT_BY_CHAR, SLOT_CHARS, TRANSPARENT } from './slots.js';
export { toDataUri, toSvg } from './svg.js';
export type { SvgOptions } from './svg.js';
export { treatPixels } from './treatment.js';
export { LAYER_ORDER, MINI_LAYERS, SELECT_ORDER } from './types.js';
export type {
  Art,
  ArtData,
  Colorway,
  DetailLevel,
  Identicon,
  Layer,
  LayerChoice,
  LayerId,
  Manifest,
  Tone,
} from './types.js';
