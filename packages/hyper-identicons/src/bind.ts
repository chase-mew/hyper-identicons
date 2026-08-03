import { MANIFEST } from './art/manifest.js';
import { generate } from './core/index.js';
import { toDataUri, toSvg } from './core/svg.js';
import type { SvgOptions } from './core/svg.js';
import type { ArtData, DetailLevel, Identicon, LayerChoice } from './core/types.js';

/**
 * The four functions both entry points expose, bound to one art set and detail level.
 *
 * Their documentation lives at the export sites in `index.ts` and `mini.ts` rather
 * than here: TypeScript does not carry a doc comment through `export const x = api.x`,
 * so anything written here reaches nobody's editor.
 */
export function createApi(artData: ArtData, detail: DetailLevel) {
  const build = (address: string): Identicon => generate(address, MANIFEST, artData, detail);

  return {
    identiconOf: build,
    identicon: (address: string, options?: SvgOptions): string => toSvg(build(address).pixels, options),
    identiconUri: (address: string, options?: SvgOptions): string =>
      toDataUri(toSvg(build(address).pixels, options)),
    identiconTraits: (address: string): LayerChoice[] => build(address).choices,
  };
}
