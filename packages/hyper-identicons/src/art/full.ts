import { accessory } from './data/accessory.js';
import { background } from './data/background.js';
import { body } from './data/body.js';
import { clothing } from './data/clothing.js';
import { eyes } from './data/eyes.js';
import { headwear } from './data/headwear.js';
import { mouth } from './data/mouth.js';
import type { ArtData } from '../core/types.js';

/** Every layer's encoded pixels. The full entry point is bound to this. */
export const ART_DATA: ArtData = { background, body, clothing, mouth, eyes, accessory, headwear };
