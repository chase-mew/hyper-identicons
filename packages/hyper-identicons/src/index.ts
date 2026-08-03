/**
 * The whole cat: background, body, clothing, mouth, eyes, accessory and headwear.
 * Import from `hyper-identicons/mini` instead for the reduced set that suits an
 * address row, which leaves the art it drops out of the bundle.
 *
 * Algorithm primitives live on `hyper-identicons/core`; art data and trait
 * metadata live on `hyper-identicons/art`.
 */
import { ART_DATA } from './art/full.js';
import { createApi } from './bind.js';

const api = createApi(ART_DATA, 'full');

/**
 * An SVG string. Omit `size` for a scale-free SVG the caller sizes with CSS.
 *
 * Throws `InvalidAddressError` unless `address` is 20 bytes of hex, with or without a
 * `0x` prefix and in any casing. Use `isAddress` to check without throwing.
 */
export const identicon = api.identicon;

/** The same SVG as a `data:` URI, ready for an `<img src>`. */
export const identiconUri = api.identiconUri;

/** The full result: normalised address, every layer's draw, and the raw pixels. */
export const identiconOf = api.identiconOf;

/** Every layer's draw, without rendering anything. */
export const identiconTraits = api.identiconTraits;

export { InvalidAddressError, isAddress, normalizeAddress } from './core/address.js';
export type { SvgOptions } from './core/svg.js';
export type {
  DetailLevel,
  Identicon,
  LayerChoice,
  LayerId,
  Tone,
} from './core/types.js';
