/**
 * Background, body, eyes and headwear — what survives a 24px address row. Importing
 * from here never pulls in the art for the layers it drops. An address renders as
 * recognisably the same character either way.
 *
 * Eyes are in the set despite contributing almost nothing at this size: without them
 * the face reads as blank and unsettling rather than simplified.
 */
import { background } from './art/data/background.js';
import { body } from './art/data/body.js';
import { eyes } from './art/data/eyes.js';
import { headwear } from './art/data/headwear.js';
import { createApi } from './bind.js';
import type { ArtData } from './core/types.js';

export const MINI_ART_DATA: ArtData = { background, body, eyes, headwear };

const api = createApi(MINI_ART_DATA, 'mini');

export const identicon = api.identicon;
export const identiconUri = api.identiconUri;
export const identiconOf = api.identiconOf;
export const identiconTraits = api.identiconTraits;
