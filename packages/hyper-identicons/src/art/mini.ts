import { background } from './data/background.js';
import { body } from './data/body.js';
import { eyes } from './data/eyes.js';
import { headwear } from './data/headwear.js';
import type { ArtData } from '../core/types.js';

/**
 * The layers that survive a 24px address row. Importing this never pulls in the
 * art for clothing, mouth or accessory.
 */
export const MINI_ART_DATA: ArtData = { background, body, eyes, headwear };
