import { decodeRle } from './rle.js';
import { CANVAS, SLOT_CHARS, TRANSPARENT } from './slots.js';
import type { ArtData, LayerChoice } from './types.js';

const MISSING_SLOT = '#ff00ff';

/**
 * Composites into 1024 opaque hex colours. See spec/v1.md §5. A layer whose pixels are
 * absent from `artData` is skipped, which is how `mini` drops layers it never imported.
 */
export function renderPixels(choices: readonly LayerChoice[], artData: ArtData): string[] {
  const background = choices.find((choice) => choice.layer === 'background');
  const fill = background?.colorway.colors.a ?? '#000000';
  const pixels = new Array<string>(CANVAS * CANVAS).fill(fill);

  for (const choice of choices) {
    const data = artData[choice.layer]?.[choice.art.id];
    if (data === undefined) continue;

    const { top, left, height, width, slots } = decodeRle(data);
    for (let row = 0; row < height; row++) {
      for (let column = 0; column < width; column++) {
        const slot = slots[row * width + column]!;
        if (slot === TRANSPARENT) continue;
        const char = SLOT_CHARS[slot];
        const color = char ? choice.colorway.colors[char] : undefined;
        pixels[(top + row) * CANVAS + (left + column)] = color ?? MISSING_SLOT;
      }
    }
  }

  return pixels;
}
