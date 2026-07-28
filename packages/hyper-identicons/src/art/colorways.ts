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
    { id: 'ebony', name: 'Ebony', tone: 'deep', weight: 22, colors: { a: '#1A1E24', b: '#292E35' } },
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
  // well as the fur.
  //
  // 'a' is the fabric, 'b' a collar or seam, 'c' a cord or cuff, 'h' the logo.
  // The trim always runs *lighter* than the fabric on a deep garment and darker on
  // a bright one, for the same reason the whiskers do: a deep garment was black
  // with black seams, so on a bright field it read as one flat silhouette with no
  // detail in it at all. Deep fabric also stops at L 0.22 rather than 0.15 -- below
  // that there is not enough room above it to put a seam.
  clothing: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 22, colors: { a: '#13161B', b: '#606A77', c: '#8A939F', h: HYPER, w: '#FFFFFF', o: '#000102' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 18, colors: { a: '#03103E', b: '#2958E3', c: '#5B8BFF', h: HYPER, w: '#FFFFFF', o: '#000008' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#300204', b: '#BA2B2E', c: '#DF6862', h: HYPER, w: '#FFFFFF', o: '#030000' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#001D06', b: '#117E34', c: '#5AA667', h: HYPER, w: '#FFFFFF', o: '#000100' } },
    { id: 'aubergine', name: 'Aubergine', tone: 'deep', weight: 12, colors: { a: '#1F0634', b: '#853BC4', c: '#AB73E4', h: HYPER, w: '#FFFFFF', o: '#010004' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#001B17', b: '#007A6B', c: '#4AA494', h: HYPER, w: '#FFFFFF', o: '#000101' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 20, colors: { a: '#427FD8', b: '#003981', c: '#ABCDFF', h: '#000C26', w: '#FFFFFF', o: '#000C26' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 18, colors: { a: '#D04F4B', b: '#78000E', c: '#FFB5AE', h: '#230001', w: '#FFFFFF', o: '#230001' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#2E9848', b: '#004B19', c: '#A3DBAA', h: '#001203', w: '#FFFFFF', o: '#001203' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#A77600', b: '#513800', c: '#E6C690', h: '#150B00', w: '#FFFFFF', o: '#150B00' } },
    { id: 'violet', name: 'Violet', tone: 'bright', weight: 12, colors: { a: '#8967D7', b: '#462281', c: '#CEC0FF', h: '#12012C', w: '#FFFFFF', o: '#12012C' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#009583', b: '#00483E', c: '#98DACC', h: '#00110E', w: '#FFFFFF', o: '#00110E' } },
  ],
  // The mouth is a line drawn straight onto the fur with nothing else to carry it,
  // so it takes the tone opposite the cat's: dark on a bright cat, light on a deep
  // one. The eyes get away without this because each polarity has something that
  // rescues it -- on a deep cat the white sclera reads where the eye outline cannot,
  // and on a bright cat the outline reads where the sclera cannot. The mouth has no
  // such second chance, which is why a dark mouth on a dark cat simply vanished.
  mouth: [
    { id: 'coal', name: 'Coal', tone: 'deep', weight: 30, colors: { o: '#141414', k: '#3A2126' } },
    { id: 'chalk', name: 'Chalk', tone: 'bright', weight: 26, colors: { o: '#A8ABB1', k: '#7B808A' } },
    { id: 'rose', name: 'Rose', tone: 'bright', weight: 14, colors: { o: '#CD9392', k: '#B35D5E' } },
  ],
  // One colourway on purpose. A tinted iris is three or four pixels across and the
  // eye reads from its shape, so a coloured one mostly just muddied the face.
  eyes: [{ id: 'coal', name: 'Coal', weight: 1, colors: { e: '#FFFFFF', i: '#101010', k: '#101010' } }],
  // Eyewear sits on the fur, so like the mouth it takes the tone opposite the cat's.
  // The frame carries that and the lens stays dark either way: black shades on a
  // charcoal cat were invisible, but light *lenses* would have been ski goggles, so
  // it is 'o' that flips and 'g' that stays put. The frame is the outline of the
  // thing anyway, which is the part a silhouette is read from.
  accessory: [
    { id: 'noir', name: 'Noir', tone: 'deep', weight: 24, colors: { o: '#030304', g: '#191B1D', w: '#FFFFFF', h: HYPER, c: '#2C2E30' } },
    { id: 'tortoise', name: 'Tortoise', tone: 'deep', weight: 10, colors: { o: '#080200', g: '#2D1200', w: '#FFFFFF', h: HYPER, c: '#3F2717' } },
    { id: 'midnight', name: 'Midnight', tone: 'deep', weight: 8, colors: { o: '#000116', g: '#071640', w: '#FFFFFF', h: HYPER, c: '#202D49' } },
    { id: 'chrome', name: 'Chrome', tone: 'bright', weight: 22, colors: { o: '#C1C4C9', g: '#0C1014', w: '#FFFFFF', h: HYPER, c: '#A7ABB0' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 12, colors: { o: '#E3BF72', g: '#160E00', w: '#FFFFFF', h: HYPER, c: '#C9A658' } },
    { id: 'aqua', name: 'Aqua', tone: 'bright', weight: 8, colors: { o: '#82D8C1', g: '#00140F', w: '#FFFFFF', h: HYPER, c: '#68BEA8' } },
    { id: 'rose', name: 'Rose', tone: 'bright', weight: 6, colors: { o: '#F3AFB8', g: '#250009', w: '#FFFFFF', h: HYPER, c: '#D8969F' } },
  ],
  // Same bands as clothing. A hat sits against the background on three sides, so
  // it is the garment least able to get away with matching the field.
  headwear: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 24, colors: { a: '#13161B', b: '#606A77', o: '#000102', h: HYPER, c: '#8A939F' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 20, colors: { a: '#03103E', b: '#2958E3', o: '#000008', h: HYPER, c: '#5B8BFF' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#300204', b: '#BA2B2E', o: '#030000', h: HYPER, c: '#DF6862' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#001D06', b: '#117E34', o: '#000100', h: HYPER, c: '#5AA667' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#001B17', b: '#007A6B', o: '#000101', h: HYPER, c: '#4AA494' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 22, colors: { a: '#427FD8', b: '#003981', o: '#000C26', h: '#000C26', c: '#ABCDFF' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 20, colors: { a: '#D04F4B', b: '#78000E', o: '#230001', h: '#230001', c: '#FFB5AE' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#2E9848', b: '#004B19', o: '#001203', h: '#001203', c: '#A3DBAA' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#A77600', b: '#513800', o: '#150B00', h: '#150B00', c: '#E6C690' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#009583', b: '#00483E', o: '#00110E', h: '#00110E', c: '#98DACC' } },
  ],
};
