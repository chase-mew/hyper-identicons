import type { Cursor } from './cursor.js';
import { LAYER_ORDER, SELECT_ORDER } from './types.js';
import type { LayerChoice, LayerId, Manifest, Tone } from './types.js';

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

const flip = (tone: Tone): Tone => (tone === 'deep' ? 'bright' : 'deep');

/**
 * The tone a layer has to take once the cat's is known, or `undefined` for the
 * layers small enough not to care.
 *
 * One rule underneath every case: take the tone opposite whatever you are drawn
 * against. The background is drawn against the cat, so it is the cat's opposite.
 * The mouth and the eyewear are drawn against the fur, so they are too. A garment
 * is drawn against the background, and the background is already the cat's
 * opposite, so being the opposite of *that* lands it back on the cat's own tone.
 */
function toneFor(layer: LayerId, cat: Tone): Tone | undefined {
  if (layer === 'background' || layer === 'mouth' || layer === 'accessory') return flip(cat);
  if (layer === 'clothing' || layer === 'headwear') return cat;
  return undefined;
}

/**
 * Draws for every layer, whatever the detail level, so that `mini` and `full` can
 * never disagree about a layer they share. Filtering happens at paint time.
 *
 * Every colourway that covers a meaningful area declares a tone, and the bands
 * those tones describe are far enough apart that opposite tones cannot help but
 * contrast. Once the cat is drawn, the rest of the palette follows from it; see
 * spec/v1.md §3.2 and AGENTS.md. This is why the body is drawn before the
 * background even though it is painted after.
 */
export function selectTraits(cursor: Cursor, manifest: Manifest): LayerChoice[] {
  const chosen = new Map<LayerId, LayerChoice>();
  let cat: Tone | undefined;

  for (const id of SELECT_ORDER) {
    const layer = manifest[id];
    const art = pick(layer.art, cursor);
    const wanted = cat && toneFor(id, cat);
    const candidates = wanted ? layer.colorways.filter((entry) => entry.tone === wanted) : layer.colorways;
    const colorway = pick(candidates, cursor);
    if (id === 'body') cat = colorway.tone;
    chosen.set(id, { layer: id, art, colorway });
  }

  return LAYER_ORDER.map((id) => chosen.get(id)!);
}
