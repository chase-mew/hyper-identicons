import type { Colorway, LayerId } from '../core/types.js';

/** Hyperliquid's brand aquamarine. Used sparingly, as an accent, on rarer traits. */
export const HYPER = '#97FCE4';

export const COLORWAYS: Record<LayerId, Colorway[]> = {
  background: [
    { id: 'void', name: 'Void', weight: 20, colors: { a: '#0B1614', b: '#12211E' } },
    { id: 'ink', name: 'Ink', weight: 14, colors: { a: '#050807', b: '#0D1412' } },
    { id: 'slate', name: 'Slate', weight: 14, colors: { a: '#1B2430', b: '#253040' } },
    { id: 'deep', name: 'Deep', weight: 12, colors: { a: '#0F2E28', b: '#143B33' } },
    { id: 'plum', name: 'Plum', weight: 10, colors: { a: '#241B33', b: '#322446' } },
    { id: 'ember', name: 'Ember', weight: 10, colors: { a: '#331F1B', b: '#452924' } },
    { id: 'sand', name: 'Sand', weight: 8, colors: { a: '#E8DFC8', b: '#D6CBB0' } },
    { id: 'mint', name: 'Mint', weight: 8, colors: { a: '#D8FBF0', b: '#BEF2E2' } },
    { id: 'rose', name: 'Rose', weight: 6, colors: { a: '#F3D9E2', b: '#E4C0CE' } },
    { id: 'sun', name: 'Sun', weight: 6, colors: { a: '#F7E7A6', b: '#EFD97E' } },
    { id: 'cyan', name: 'Cyan', weight: 5, colors: { a: '#A6E9F7', b: '#7FD8EE' } },
    { id: 'aqua', name: 'Aqua', weight: 2, colors: { a: HYPER, b: '#7BE9CE' } },
  ],
  // 's' is the whisker line and 'p' the inner ear. Neither is a fill: both have
  // to stay legible against 'f', which means going darker on pale cats and
  // lighter on dark ones. The reference draws the inner ear as solid black, so
  // 'p' tracks the outline rather than the pink a cat's ear would really be.
  body: [
    { id: 'snow', name: 'Snow', weight: 18, colors: { o: '#101010', f: '#FDFDFD', s: '#2E2E2E', l: '#FFFFFF', p: '#141414' } },
    { id: 'void', name: 'Void', weight: 16, colors: { o: '#000000', f: '#1B1B1B', s: '#5C5C5C', l: '#2E2E2E', p: '#4E4E4E' } },
    { id: 'ash', name: 'Ash', weight: 14, colors: { o: '#1A1A1A', f: '#9AA3A8', s: '#2F3639', l: '#D8DEE1', p: '#232A2E' } },
    { id: 'ginger', name: 'Ginger', weight: 13, colors: { o: '#2A1408', f: '#E08A3C', s: '#7A3F10', l: '#F7D9B0', p: '#5E2C0C' } },
    { id: 'cocoa', name: 'Cocoa', weight: 11, colors: { o: '#1F1207', f: '#7A4A22', s: '#D8B48A', l: '#C79A6A', p: '#2E1B0C' } },
    { id: 'cream', name: 'Cream', weight: 10, colors: { o: '#241C0F', f: '#F0DFC0', s: '#8A7550', l: '#FFF6E4', p: '#463620' } },
    { id: 'slate', name: 'Slate', weight: 8, colors: { o: '#0D1218', f: '#4A5A6B', s: '#A8BCCB', l: '#8FA3B4', p: '#151D26' } },
    { id: 'lilac', name: 'Lilac', weight: 5, colors: { o: '#1D1428', f: '#B9A7E0', s: '#5B4A85', l: '#E6DCFA', p: '#392A55' } },
    { id: 'ghost', name: 'Ghost', weight: 3, colors: { o: '#0A1A18', f: '#5F8F86', s: '#C8EDE6', l: '#9CC7BF', p: '#12302B' } },
    { id: 'aqua', name: 'Aqua', weight: 2, colors: { o: '#06231D', f: HYPER, s: '#25806A', l: '#DBFFF6', p: '#0C382E' } },
  ],
  clothing: [
    { id: 'hyper', name: 'Hyper', weight: 18, colors: { a: '#141414', b: '#2A2A2A', c: '#4A4A4A', h: HYPER, w: '#FFFFFF' } },
    { id: 'crimson', name: 'Crimson', weight: 14, colors: { a: '#B3283C', b: '#8C1B2C', c: '#D9556A', h: '#F5D6DA', w: '#FFFFFF' } },
    { id: 'cobalt', name: 'Cobalt', weight: 14, colors: { a: '#24479B', b: '#1A3577', c: '#4E70C4', h: '#CFE0FF', w: '#FFFFFF' } },
    { id: 'moss', name: 'Moss', weight: 12, colors: { a: '#3C6B3A', b: '#2B5029', c: '#5E9159', h: '#D6F0C8', w: '#FFFFFF' } },
    { id: 'bone', name: 'Bone', weight: 12, colors: { a: '#EDE7D8', b: '#D8CFB8', c: '#B9AE93', h: '#2B2B2B', w: '#FFFFFF' } },
    { id: 'ash', name: 'Ash', weight: 10, colors: { a: '#6E7780', b: '#545C64', c: '#8D96A0', h: '#E4EAEE', w: '#FFFFFF' } },
    { id: 'violet', name: 'Violet', weight: 8, colors: { a: '#6A3CB5', b: '#522C90', c: '#8B5FD6', h: '#E5D6FF', w: '#FFFFFF' } },
    { id: 'aqua', name: 'Aqua', weight: 3, colors: { a: HYPER, b: '#7BE9CE', c: '#B8FFEE', h: '#06231D', w: '#FFFFFF' } },
  ],
  mouth: [
    { id: 'coal', name: 'Coal', weight: 30, colors: { o: '#141414', k: '#3A2126' } },
    { id: 'soft', name: 'Soft', weight: 10, colors: { o: '#4A3238', k: '#6B4750' } },
  ],
  eyes: [
    { id: 'coal', name: 'Coal', weight: 26, colors: { e: '#FFFFFF', i: '#101010', k: '#101010', h: HYPER } },
    { id: 'aqua', name: 'Aqua', weight: 16, colors: { e: '#FFFFFF', i: '#1E9E86', k: '#101010', h: HYPER } },
    { id: 'amber', name: 'Amber', weight: 14, colors: { e: '#FFFFFF', i: '#C97B1E', k: '#101010', h: HYPER } },
    { id: 'violet', name: 'Violet', weight: 9, colors: { e: '#FFFFFF', i: '#7A45C4', k: '#101010', h: HYPER } },
    { id: 'crimson', name: 'Crimson', weight: 4, colors: { e: '#FFFFFF', i: '#C42B3A', k: '#101010', h: HYPER } },
  ],
  accessory: [
    { id: 'noir', name: 'Noir', weight: 24, colors: { o: '#0A0A0A', g: '#1E1E1E', w: '#FFFFFF', h: HYPER, c: '#C9C9C9' } },
    { id: 'gold', name: 'Gold', weight: 10, colors: { o: '#3A2B08', g: '#F2C14E', w: '#FFF6DC', h: HYPER, c: '#E0B54A' } },
    { id: 'rose', name: 'Rose', weight: 8, colors: { o: '#3A1420', g: '#E48AA8', w: '#FFE7EF', h: HYPER, c: '#D96D91' } },
    { id: 'aqua', name: 'Aqua', weight: 5, colors: { o: '#06231D', g: HYPER, w: '#FFFFFF', h: HYPER, c: '#7BE9CE' } },
  ],
  headwear: [
    { id: 'hyper', name: 'Hyper', weight: 20, colors: { a: '#141414', b: '#2A2A2A', o: '#000000', h: HYPER, c: '#C9C9C9' } },
    { id: 'crimson', name: 'Crimson', weight: 14, colors: { a: '#B3283C', b: '#8C1B2C', o: '#3A0A11', h: '#F5D6DA', c: '#D9556A' } },
    { id: 'cobalt', name: 'Cobalt', weight: 14, colors: { a: '#24479B', b: '#1A3577', o: '#0B173A', h: '#CFE0FF', c: '#4E70C4' } },
    { id: 'bone', name: 'Bone', weight: 12, colors: { a: '#EDE7D8', b: '#D8CFB8', o: '#2B2B2B', h: '#2B2B2B', c: '#B9AE93' } },
    { id: 'moss', name: 'Moss', weight: 10, colors: { a: '#3C6B3A', b: '#2B5029', o: '#16250F', h: '#D6F0C8', c: '#5E9159' } },
    { id: 'gold', name: 'Gold', weight: 6, colors: { a: '#E0B54A', b: '#C29A34', o: '#3A2B08', h: '#FFF6DC', c: '#F2C14E' } },
    { id: 'aqua', name: 'Aqua', weight: 3, colors: { a: HYPER, b: '#7BE9CE', o: '#06231D', h: '#06231D', c: '#06231D' } },
  ],
};
