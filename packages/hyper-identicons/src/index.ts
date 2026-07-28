import { accessory } from './art/data/accessory.js';
import { background } from './art/data/background.js';
import { body } from './art/data/body.js';
import { clothing } from './art/data/clothing.js';
import { eyes } from './art/data/eyes.js';
import { headwear } from './art/data/headwear.js';
import { mouth } from './art/data/mouth.js';
import { createApi } from './bind.js';
import type { ArtData } from './core/types.js';

export const ART_DATA: ArtData = { background, body, clothing, mouth, eyes, accessory, headwear };

const api = createApi(ART_DATA, 'full');

export const identicon = api.identicon;
export const identiconUri = api.identiconUri;
export const identiconOf = api.identiconOf;
export const identiconTraits = api.identiconTraits;

export { MANIFEST } from './art/manifest.js';
export { COLORWAYS, HYPER } from './art/colorways.js';
export * from './core/index.js';
