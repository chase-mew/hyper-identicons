import type { Cursor } from './cursor.js';
import { LAYER_ORDER } from './types.js';
import type { LayerChoice, Manifest } from './types.js';

/** Multiply-shift weighted choice. See spec/v1.md §3.1. */
export function pick<T extends { weight: number }>(candidates: readonly T[], cursor: Cursor): T {
  if (candidates.length === 0) throw new Error('Cannot pick from an empty candidate list');
  let total = 0;
  for (const candidate of candidates) total += candidate.weight;
  const target = (cursor.next16() * total) >> 16;
  let running = 0;
  for (const candidate of candidates) {
    running += candidate.weight;
    if (target < running) return candidate;
  }
  return candidates[candidates.length - 1]!;
}

/**
 * Draws for every layer, whatever the detail level, so that `mini` and `full` can
 * never disagree about a layer they share. Filtering happens at paint time.
 */
export function selectTraits(cursor: Cursor, manifest: Manifest): LayerChoice[] {
  return LAYER_ORDER.map((id) => {
    const layer = manifest[id];
    return { layer: id, art: pick(layer.art, cursor), colorway: pick(layer.colorways, cursor) };
  });
}
