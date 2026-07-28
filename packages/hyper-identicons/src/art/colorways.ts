import type { Colorway, LayerId } from '../core/types.js';

/** Hyperliquid's brand aquamarine. The one colour the whole palette is built around. */
export const HYPER = '#97FCE4';

/**
 * Every colour here was placed by OKLab lightness first and hue second. The bands,
 * the pairing rule and the reasoning are in AGENTS.md; `pnpm tsx scripts/audit-colors.ts`
 * prints every contrast the palette has to survive and the test suite fails the
 * build if one slips. Do not add a colour here by eye without running that.
 *
 * Hues come from Hyperliquid (aquamarine, foam, dolphin, firefly, ebony, all sitting
 * on hue 180) and from Bounce (violet and indigo, on hue 285-300), with a small
 * spread of warm and cool neighbours so a wallet does not always land on teal.
 */
export const COLORWAYS: Record<LayerId, Colorway[]> = {
  // Deep and bright are never mixed in one identicon: whichever tone the cat is,
  // the background takes the other. Weights are relative within a tone, since the
  // cat has already decided which half of this list is in play.
  background: [
    { id: 'ebony', name: 'Ebony', tone: 'deep', weight: 22, colors: { a: '#060911', b: '#0F141E' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 20, colors: { a: '#031A16', b: '#082621' } },
    { id: 'firefly', name: 'Firefly', tone: 'deep', weight: 16, colors: { a: '#052824', b: '#0C3630' } },
    { id: 'slate', name: 'Slate', tone: 'deep', weight: 15, colors: { a: '#102031', b: '#1A2D40' } },
    { id: 'indigo', name: 'Indigo', tone: 'deep', weight: 12, colors: { a: '#1C163F', b: '#272251' } },
    { id: 'plum', name: 'Plum', tone: 'deep', weight: 8, colors: { a: '#2A0C2C', b: '#38173B' } },
    { id: 'ember', name: 'Ember', tone: 'deep', weight: 7, colors: { a: '#341303', b: '#441E0B' } },
    { id: 'foam', name: 'Foam', tone: 'bright', weight: 20, colors: { a: '#E4F6F4', b: '#CEE3E1' } },
    { id: 'dolphin', name: 'Dolphin', tone: 'bright', weight: 18, colors: { a: '#C3F3EC', b: '#AAE1D9' } },
    { id: 'sand', name: 'Sand', tone: 'bright', weight: 16, colors: { a: '#F1DFBC', b: '#DFCCA3' } },
    { id: 'sky', name: 'Sky', tone: 'bright', weight: 13, colors: { a: '#B5E2FD', b: '#9CCFEE' } },
    { id: 'orchid', name: 'Orchid', tone: 'bright', weight: 12, colors: { a: '#DBCAFF', b: '#CAB4F4' } },
    { id: 'sun', name: 'Sun', tone: 'bright', weight: 11, colors: { a: '#F7DD7D', b: '#E7C955' } },
    { id: 'blush', name: 'Blush', tone: 'bright', weight: 8, colors: { a: '#FFCCCE', b: '#F1B6B9' } },
    { id: 'aqua', name: 'Aqua', tone: 'bright', weight: 2, colors: { a: HYPER, b: '#72EBD0' } },
  ],
  // 'o' is the ink line, 's' the whiskers, 'p' the inner ear.
  //
  // Only 'o' is allowed to disappear into the fur, and only on a deep cat, where
  // it has a different job: there the silhouette is carried by the fur against a
  // bright field and the ink is just the rim, so it is measured against the
  // background rather than the fur. 's' and 'p' have no such excuse. Both are
  // drawn on the fur and have to be read off it, which on a deep cat means going
  // lighter -- there is nothing left underneath. The reference draws the inner ear
  // solid black and bright cats keep that, but on a deep cat a black ear is a hole,
  // so it flips to the warm tint a real cat's ear has.
  //
  // Deep fur stops at L 0.34 rather than going to true black, which is what leaves
  // the whiskers and the ear anywhere to go.
  body: [
    { id: 'snow', name: 'Snow', tone: 'bright', weight: 16, colors: { o: '#222222', f: '#F5F5F5', s: '#A8A8A8', p: '#303030' } },
    { id: 'ginger', name: 'Ginger', tone: 'bright', weight: 12, colors: { o: '#1B0B02', f: '#F7A062', s: '#8A664D', p: '#2B1305' } },
    { id: 'cream', name: 'Cream', tone: 'bright', weight: 10, colors: { o: '#1A1304', f: '#EFE0C0', s: '#A19479', p: '#2A2009' } },
    { id: 'ash', name: 'Ash', tone: 'bright', weight: 10, colors: { o: '#0C1114', f: '#B6BFC4', s: '#6E767A', p: '#181F23' } },
    { id: 'aqua', name: 'Aqua', tone: 'bright', weight: 6, colors: { o: '#051B16', f: HYPER, s: '#70A598', p: '#0A2B24' } },
    { id: 'lilac', name: 'Lilac', tone: 'bright', weight: 5, colors: { o: '#0F0B1C', f: '#CEC0FF', s: '#8279A1', p: '#1D1530' } },
    { id: 'sage', name: 'Sage', tone: 'bright', weight: 3, colors: { o: '#0A1211', f: '#ABC8C3', s: '#657D79', p: '#141E1C' } },
    { id: 'void', name: 'Void', tone: 'deep', weight: 14, colors: { o: '#000000', f: '#383838', s: '#959595', p: '#A9817D' } },
    { id: 'firefly', name: 'Firefly', tone: 'deep', weight: 8, colors: { o: '#000100', f: '#13463F', s: '#87A19C', p: '#AF8682' } },
    { id: 'slate', name: 'Slate', tone: 'deep', weight: 8, colors: { o: '#000001', f: '#354A5C', s: '#9BAAB7', p: '#BC938F' } },
    { id: 'cocoa', name: 'Cocoa', tone: 'deep', weight: 6, colors: { o: '#010000', f: '#6A4225', s: '#BDA99C', p: '#C29995' } },
    { id: 'indigo', name: 'Indigo', tone: 'deep', weight: 2, colors: { o: '#000003', f: '#3F3C68', s: '#9F9FB7', p: '#B68D89' } },
  ],
  // Garments take the cat's own tone, which is the background rule seen from the
  // other side: a hoodie reaches the canvas edge, so it has to clear the field as
  // well as the fur. That squeezes them into a narrower band than either -- deep
  // garments go darker than any deep cat, bright ones sit below any bright cat --
  // and it is why the light ones are mid-tones rather than pastels. The Hyperliquid
  // accent survives in 'h', which flips with the tone so the logo always reads.
  clothing: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 22, colors: { a: '#090B0F', b: '#020204', c: '#191B1E', h: HYPER, w: '#FFFFFF' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 18, colors: { a: '#000728', b: '#00020F', c: '#001449', h: HYPER, w: '#FFFFFF' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#1F0001', b: '#0A0000', c: '#3A0003', h: HYPER, w: '#FFFFFF' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#001003', b: '#000401', c: '#00220A', h: HYPER, w: '#FFFFFF' } },
    { id: 'aubergine', name: 'Aubergine', tone: 'deep', weight: 12, colors: { a: '#130024', b: '#05000D', c: '#280043', h: HYPER, w: '#FFFFFF' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#000F0C', b: '#000303', c: '#00201C', h: HYPER, w: '#FFFFFF' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 20, colors: { a: '#377EE3', b: '#236BCF', c: '#5E96E8', h: '#08102E', w: '#FFFFFF' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 18, colors: { a: '#DB4241', b: '#C52B30', c: '#E36B64', h: '#2A0A0E', w: '#FFFFFF' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#2E9848', b: '#128537', c: '#5DA96A', h: '#08190B', w: '#FFFFFF' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#A1790C', b: '#8C6800', c: '#B0914B', h: '#211808', w: '#FFFFFF' } },
    { id: 'violet', name: 'Violet', tone: 'bright', weight: 12, colors: { a: '#8B61E3', b: '#7A4ECF', c: '#9D7FE8', h: '#150826', w: '#FFFFFF' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#239382', b: '#008171', c: '#59A697', h: '#04201B', w: '#FFFFFF' } },
  ],
  // The mouth is a line drawn straight onto the fur with nothing else to carry it,
  // so it takes the tone opposite the cat's: dark on a bright cat, light on a deep
  // one. The eyes get away without this because each polarity has something that
  // rescues it -- on a deep cat the white sclera reads where the eye outline cannot,
  // and on a bright cat the outline reads where the sclera cannot. The mouth has no
  // such second chance, which is why a dark mouth on a dark cat simply vanished.
  mouth: [
    { id: 'coal', name: 'Coal', tone: 'deep', weight: 30, colors: { o: '#141414', k: '#3A2126' } },
    { id: 'soft', name: 'Soft', tone: 'deep', weight: 10, colors: { o: '#4A3238', k: '#6B4750' } },
    { id: 'chalk', name: 'Chalk', tone: 'bright', weight: 26, colors: { o: '#A8ABB1', k: '#7B808A' } },
    { id: 'rose', name: 'Rose', tone: 'bright', weight: 14, colors: { o: '#CD9392', k: '#B35D5E' } },
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
  // Same bands as clothing. A hat sits against the background on three sides, so
  // it is the garment least able to get away with matching the field.
  headwear: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 24, colors: { a: '#090B0F', b: '#020204', o: '#000000', h: HYPER, c: '#191B1E' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 20, colors: { a: '#000728', b: '#00020F', o: '#000004', h: HYPER, c: '#001449' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#1F0001', b: '#0A0000', o: '#040000', h: HYPER, c: '#3A0003' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#001003', b: '#000401', o: '#000100', h: HYPER, c: '#00220A' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#000F0C', b: '#000303', o: '#000100', h: HYPER, c: '#00201C' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 22, colors: { a: '#377EE3', b: '#236BCF', o: '#08102E', h: '#08102E', c: '#5E96E8' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 20, colors: { a: '#DB4241', b: '#C52B30', o: '#2A0A0E', h: '#2A0A0E', c: '#E36B64' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#2E9848', b: '#128537', o: '#08190B', h: '#08190B', c: '#5DA96A' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#A1790C', b: '#8C6800', o: '#211808', h: '#211808', c: '#B0914B' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#239382', b: '#008171', o: '#04201B', h: '#04201B', c: '#59A697' } },
  ],
};
