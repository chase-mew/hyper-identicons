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

export interface Colorway {
  id: string;
  name: string;
  weight: number;
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
