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
  //
  // The deep half sits at L 0.30 rather than down at 0.14. Backgrounds that dark
  // are not dramatic, they are grubby: near-black reads as an absence of light
  // rather than as a colour, and seven of them in a row made the whole set look
  // like it had been left out in the rain. Lifting them to a real shade and
  // letting the chroma up to 0.05-0.08 costs nothing, because a deep field only
  // ever appears behind a bright cat and bright fur starts at L 0.78.
  background: [
    { id: 'ebony', name: 'Ebony', tone: 'deep', weight: 22, colors: { a: '#272E38', b: '#353E49' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 20, colors: { a: '#003636', b: '#034747' } },
    { id: 'firefly', name: 'Firefly', tone: 'deep', weight: 16, colors: { a: '#003A2D', b: '#004C3B' } },
    { id: 'slate', name: 'Slate', tone: 'deep', weight: 15, colors: { a: '#19324B', b: '#26425E' } },
    { id: 'indigo', name: 'Indigo', tone: 'deep', weight: 12, colors: { a: '#302951', b: '#3F3864' } },
    { id: 'plum', name: 'Plum', tone: 'deep', weight: 8, colors: { a: '#47203F', b: '#592E50' } },
    { id: 'ember', name: 'Ember', tone: 'deep', weight: 7, colors: { a: '#4E220B', b: '#623018' } },
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
    // White shaded in pale *blue* rather than grey, which is how the ecosystem's own
    // cat is drawn and the thing every imitation of it gets wrong. One step deeper
    // than the #88D5F0 it is quoting, which scores Lc 28 against white and would
    // otherwise be the only detail in the palette below the floor.
    { id: 'frost', name: 'Frost', tone: 'bright', weight: 14, colors: { o: '#02231E', f: '#FFFFFF', s: '#7AC6E4', p: '#F8B1CC' } },
    { id: 'snow', name: 'Snow', tone: 'bright', weight: 16, colors: { o: '#222222', f: '#F5F5F5', s: '#A8A8A8', p: '#303030' } },
    { id: 'ginger', name: 'Ginger', tone: 'bright', weight: 12, colors: { o: '#1B0B02', f: '#F7A062', s: '#8A664D', p: '#2B1305' } },
    { id: 'cream', name: 'Cream', tone: 'bright', weight: 10, colors: { o: '#1A1304', f: '#EFE0C0', s: '#A19479', p: '#2A2009' } },
    { id: 'ash', name: 'Ash', tone: 'bright', weight: 10, colors: { o: '#0C1114', f: '#B6BFC4', s: '#6E767A', p: '#181F23' } },
    { id: 'aqua', name: 'Aqua', tone: 'bright', weight: 6, colors: { o: '#051B16', f: HYPER, s: '#70A598', p: '#0A2B24' } },
    { id: 'lilac', name: 'Lilac', tone: 'bright', weight: 5, colors: { o: '#0F0B1C', f: '#CEC0FF', s: '#8279A1', p: '#1D1530' } },
    { id: 'sage', name: 'Sage', tone: 'bright', weight: 3, colors: { o: '#0A1211', f: '#ABC8C3', s: '#657D79', p: '#141E1C' } },
    // Deep fur sits at L 0.47-0.52, well above the 0.34 the band used to bottom
    // out at. A cat at 0.34 is not a dark cat, it is a cat in shadow: the hue is
    // there in the hex and none of it survives to the eye. Bright fields start at
    // L 0.87, so there is room for these to be actual colours -- a green cat, a
    // blue cat, a copper cat -- and they only had to be murky while the deep
    // backgrounds were murky enough to need the contrast.
    { id: 'void', name: 'Void', tone: 'deep', weight: 14, colors: { o: '#06070A', f: '#585B5F', s: '#A2A5A8', p: '#E1A6A5' } },
    { id: 'firefly', name: 'Firefly', tone: 'deep', weight: 8, colors: { o: '#000F0A', f: '#206C58', s: '#95B2A8', p: '#E5A6A5' } },
    { id: 'slate', name: 'Slate', tone: 'deep', weight: 8, colors: { o: '#010E1E', f: '#43668A', s: '#9EB0C4', p: '#E7A8A7' } },
    { id: 'cocoa', name: 'Cocoa', tone: 'deep', weight: 6, colors: { o: '#200700', f: '#905A33', s: '#C7AFA0', p: '#EAABAA' } },
    { id: 'indigo', name: 'Indigo', tone: 'deep', weight: 2, colors: { o: '#100722', f: '#675891', s: '#AFA9C5', p: '#E7A8A7' } },
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
  //
  // Deep fabric sits at L 0.29 and its trim at 0.47, a step of 0.18. It used to be
  // 0.15 to 0.55 with the trim's chroma up at 0.20, and that combination is what
  // makes a garment look like it is lit from inside: a near-black field with one
  // fully saturated line across it is a neon sign, not a seam. The fix is both
  // ends at once -- lift the fabric until it is a colour, and pull the trim's
  // chroma back to roughly half the fabric's lightness step above it.
  clothing: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 22, colors: { a: '#26292D', b: '#575B60', c: '#858A8F', h: HYPER, w: '#FFFFFF', o: '#040608' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 18, colors: { a: '#17284F', b: '#395995', c: '#6C8CBB', h: HYPER, w: '#FFFFFF', o: '#01051A' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#4F1313', b: '#963A32', c: '#BE786D', h: HYPER, w: '#FFFFFF', o: '#170001' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#063519', b: '#2B6C3D', c: '#6C9B72', h: HYPER, w: '#FFFFFF', o: '#000B03' } },
    { id: 'aubergine', name: 'Aubergine', tone: 'deep', weight: 12, colors: { a: '#3C1B46', b: '#72478A', c: '#9C80B6', h: HYPER, w: '#FFFFFF', o: '#100115' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#00322F', b: '#006963', c: '#509A91', h: HYPER, w: '#FFFFFF', o: '#000908' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 20, colors: { a: '#638FDF', b: '#385B9E', c: '#BCD2F9', h: '#020B24', w: '#FFFFFF', o: '#020B24' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 18, colors: { a: '#D66C62', b: '#993A33', c: '#F8C4BE', h: '#210101', w: '#FFFFFF', o: '#210101' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#51A561', b: '#296E38', c: '#B7DFBB', h: '#001203', w: '#FFFFFF', o: '#001203' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#B98615', b: '#865901', c: '#F0D39F', h: '#190C00', w: '#FFFFFF', o: '#190C00' } },
    { id: 'violet', name: 'Violet', tone: 'bright', weight: 12, colors: { a: '#9D7CD3', b: '#694A99', c: '#D9CAF8', h: '#120522', w: '#FFFFFF', o: '#120522' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#01A699', b: '#007067', c: '#A5E4DB', h: '#00110F', w: '#FFFFFF', o: '#00110F' } },
  ],
  // The mouth is a line drawn straight onto the fur with nothing else to carry it,
  // so it takes the tone opposite the cat's: dark on a bright cat, light on a deep
  // one. The eyes get away without this because each polarity has something that
  // rescues it -- on a deep cat the white sclera reads where the eye outline cannot,
  // and on a bright cat the outline reads where the sclera cannot. The mouth has no
  // such second chance, which is why a dark mouth on a dark cat simply vanished.
  mouth: [
    { id: 'coal', name: 'Coal', tone: 'deep', weight: 30, colors: { o: '#141414', k: '#3A2126', p: '#C4626F' } },
    // `k` is warm rather than grey. An open mouth on a near-black cat has to be
    // light to be seen at all, and a light *neutral* one stopped reading as a
    // cavity and started reading as a block of teeth.
    //
    // It also has to sit between the two things it touches rather than beside
    // one of them. On a deep cat the mouth line is light, so the interior has to
    // be darker than the line and lighter than the fur: L 0.66 splits the gap
    // between fur at 0.50 and line at 0.80. A step behind the line and the open
    // mouth flattened into a light patch with a pink centre, which reads as a
    // sticking plaster.
    { id: 'chalk', name: 'Chalk', tone: 'bright', weight: 26, colors: { o: '#B9BEC4', k: '#BE7E82', p: '#F0C4C9' } },
    { id: 'rose', name: 'Rose', tone: 'bright', weight: 14, colors: { o: '#E2B3B5', k: '#C67E83', p: '#F0C9CC' } },
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
    // Deep frames are charcoal, oxide and midnight rather than three shades of
    // black, and their scan line is a muted version of the brand mint instead of
    // the brand mint itself. Aquamarine at L 0.92 laid directly on a lens at
    // L 0.14 is the single most neon thing the palette can produce.
    { id: 'noir', name: 'Noir', tone: 'deep', weight: 24, colors: { o: '#181A1C', g: '#07080B', w: '#FFFFFF', h: '#7FA8A2', c: '#2E3134' } },
    { id: 'tortoise', name: 'Tortoise', tone: 'deep', weight: 10, colors: { o: '#351904', g: '#1B0500', w: '#FFFFFF', h: '#B89C7C', c: '#51321D' } },
    { id: 'midnight', name: 'Midnight', tone: 'deep', weight: 8, colors: { o: '#101E39', g: '#030A1E', w: '#FFFFFF', h: '#7BAAAC', c: '#283958' } },
    { id: 'chrome', name: 'Chrome', tone: 'bright', weight: 22, colors: { o: '#C1C4C9', g: '#0C1014', w: '#FFFFFF', h: HYPER, c: '#A7ABB0' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 12, colors: { o: '#E3BF72', g: '#160E00', w: '#FFFFFF', h: HYPER, c: '#C9A658' } },
    { id: 'aqua', name: 'Aqua', tone: 'bright', weight: 8, colors: { o: '#82D8C1', g: '#00140F', w: '#FFFFFF', h: HYPER, c: '#68BEA8' } },
    { id: 'rose', name: 'Rose', tone: 'bright', weight: 6, colors: { o: '#F3AFB8', g: '#250009', w: '#FFFFFF', h: HYPER, c: '#D8969F' } },
  ],
  // Same bands as clothing. A hat sits against the background on three sides, so
  // it is the garment least able to get away with matching the field.
  headwear: [
    { id: 'ink', name: 'Ink', tone: 'deep', weight: 24, colors: { a: '#26292D', b: '#575B60', o: '#040608', h: HYPER, c: '#858A8F' } },
    { id: 'navy', name: 'Navy', tone: 'deep', weight: 20, colors: { a: '#17284F', b: '#395995', o: '#01051A', h: HYPER, c: '#6C8CBB' } },
    { id: 'oxblood', name: 'Oxblood', tone: 'deep', weight: 16, colors: { a: '#4F1313', b: '#963A32', o: '#170001', h: HYPER, c: '#BE786D' } },
    { id: 'pine', name: 'Pine', tone: 'deep', weight: 14, colors: { a: '#063519', b: '#2B6C3D', o: '#000B03', h: HYPER, c: '#6C9B72' } },
    { id: 'abyss', name: 'Abyss', tone: 'deep', weight: 8, colors: { a: '#00322F', b: '#006963', o: '#000908', h: HYPER, c: '#509A91' } },
    { id: 'cobalt', name: 'Cobalt', tone: 'bright', weight: 22, colors: { a: '#638FDF', b: '#385B9E', o: '#020B24', h: '#020B24', c: '#BCD2F9' } },
    { id: 'crimson', name: 'Crimson', tone: 'bright', weight: 20, colors: { a: '#D66C62', b: '#993A33', o: '#210101', h: '#210101', c: '#F8C4BE' } },
    { id: 'moss', name: 'Moss', tone: 'bright', weight: 16, colors: { a: '#51A561', b: '#296E38', o: '#001203', h: '#001203', c: '#B7DFBB' } },
    { id: 'gold', name: 'Gold', tone: 'bright', weight: 14, colors: { a: '#B98615', b: '#865901', o: '#190C00', h: '#190C00', c: '#F0D39F' } },
    { id: 'teal', name: 'Teal', tone: 'bright', weight: 10, colors: { a: '#01A699', b: '#007067', o: '#00110F', h: '#00110F', c: '#A5E4DB' } },
  ],
};
