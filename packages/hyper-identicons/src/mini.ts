/**
 * Background, body, eyes and headwear — what survives a 24px address row. Importing
 * from here never pulls in the art for the layers it drops. An address renders as
 * recognisably the same character either way.
 *
 * Eyes are in the set despite contributing almost nothing at this size: without them
 * the face reads as blank and unsettling rather than simplified.
 */
import { MINI_ART_DATA } from './art/mini.js';
import { createApi } from './bind.js';

const api = createApi(MINI_ART_DATA, 'mini');

/**
 * An SVG string painting the mini layer set. Omit `size` for a scale-free SVG.
 *
 * Throws `InvalidAddressError` unless `address` is 20 bytes of hex, with or without a
 * `0x` prefix and in any casing.
 */
export const identicon = api.identicon;

/** The same SVG as a `data:` URI, ready for an `<img src>`. */
export const identiconUri = api.identiconUri;

/** The full result: normalised address, every layer's draw, and the raw pixels. */
export const identiconOf = api.identiconOf;

/** Every layer's draw, including the layers this detail level does not paint. */
export const identiconTraits = api.identiconTraits;
