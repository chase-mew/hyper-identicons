import type { SlotChar } from './slots.js';

export const LAYER_ORDER = [
  'background',
  'body',
  'clothing',
  'mouth',
  'eyes',
  'accessory',
  'headwear',
] as const;

export type LayerId = (typeof LAYER_ORDER)[number];

/**
 * The order the draws happen in, which is not the order the layers are painted
 * in. The body goes first so the background can be picked to contrast with the
 * cat that is about to sit on it. See spec/v1.md §3.2.
 */
export const SELECT_ORDER = [
  'body',
  'background',
  'clothing',
  'mouth',
  'eyes',
  'accessory',
  'headwear',
] as const satisfies readonly LayerId[];

/** Layers painted by the `mini` detail level. See spec/v1.md §6. */
export const MINI_LAYERS = [
  'background',
  'body',
  'eyes',
  'headwear',
] as const satisfies readonly LayerId[];

export type DetailLevel = 'full' | 'mini';

export interface Art {
  id: string;
  name: string;
  /** Relative, not a percentage. Must be >= 1. */
  weight: number;
}

/**
 * Which side of the lightness gap a colourway sits on. See AGENTS.md for the
 * bands and the reasoning; the short version is that the cat and the background
 * are always drawn from opposite tones, which is what makes every combination
 * legible without having to check the pairs one by one.
 */
export type Tone = 'deep' | 'bright';

export interface Colorway {
  id: string;
  name: string;
  weight: number;
  /** Carried only by layers big enough for their tone to matter: body and background. */
  tone?: Tone;
  colors: Partial<Record<SlotChar, string>>;
}

export interface Layer {
  id: LayerId;
  art: Art[];
  colorways: Colorway[];
}

/**
 * Names and weights for every layer, with no pixels. Selection needs only this, which
 * is what lets `mini` reproduce `full`'s draws without importing art it never paints.
 */
export type Manifest = Record<LayerId, Layer>;

/** Base64 run-length encoded pixels, keyed by layer then art id. See spec/v1.md §4.3. */
export type ArtData = Partial<Record<LayerId, Record<string, string>>>;

export interface LayerChoice {
  layer: LayerId;
  art: Art;
  colorway: Colorway;
}

export interface Identicon {
  address: string;
  detail: DetailLevel;
  /** Every layer's draw, including layers this detail level does not paint. */
  choices: LayerChoice[];
  /** 1024 hex colours, row-major, fully opaque. */
  pixels: string[];
}
