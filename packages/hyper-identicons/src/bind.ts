import { MANIFEST } from './art/manifest.js';
import { generate } from './core/index.js';
import { toDataUri, toSvg } from './core/svg.js';
import type { SvgOptions } from './core/svg.js';
import type { ArtData, DetailLevel, Identicon, LayerChoice } from './core/types.js';

export function createApi(artData: ArtData, detail: DetailLevel) {
  const build = (address: string): Identicon => generate(address, MANIFEST, artData, detail);

  return {
    /** The full result: normalised address, every layer's draw, and the raw pixels. */
    identiconOf: build,
    /** An SVG string. Omit `size` for a scale-free SVG the caller sizes with CSS. */
    identicon: (address: string, options?: SvgOptions): string => toSvg(build(address).pixels, options),
    /** A `data:` URI, ready for an `<img src>`. */
    identiconUri: (address: string, options?: SvgOptions): string =>
      toDataUri(toSvg(build(address).pixels, options)),
    /** Every layer's draw, including layers this detail level does not paint. */
    identiconTraits: (address: string): LayerChoice[] => build(address).choices,
  };
}
