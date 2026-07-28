import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keccak_256 } from '@noble/hashes/sha3';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA, identicon, identiconOf, identiconTraits } from '../src/index.js';
import { MINI_ART_DATA, identiconOf as identiconOfMini } from '../src/mini.js';
import { InvalidAddressError, decodeRle, encodeRle, normalizeAddress } from '../src/core/index.js';
import { CANVAS } from '../src/core/slots.js';
import { LAYER_ORDER, MINI_LAYERS } from '../src/core/types.js';
import type { Tone } from '../src/core/types.js';
import { apca, contrast, lightness, separation } from '../../hyper-identicons/scripts/color.js';

const VITALIK = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

function sample(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const digest = Buffer.from(keccak_256(`sample/${index}`)).toString('hex');
    return `0x${digest.slice(0, 40)}`;
  });
}

test('the same address always renders the same bytes', () => {
  for (const address of sample(50)) {
    assert.equal(identicon(address), identicon(address));
  }
});

test('different addresses render differently', () => {
  const rendered = new Set(sample(300).map((address) => identicon(address)));
  assert.equal(rendered.size, 300);
});

test('address casing and 0x prefix carry no information', () => {
  const lower = VITALIK.toLowerCase();
  assert.equal(identicon(VITALIK), identicon(lower));
  assert.equal(identicon(VITALIK), identicon(lower.slice(2)));
  assert.equal(identicon(VITALIK), identicon(VITALIK.toUpperCase().replace('0X', '0x')));
});

test('malformed addresses are rejected rather than rendered', () => {
  for (const bad of ['', '0x', 'hello', '0x1234', `${VITALIK}00`, `0xzz${VITALIK.slice(4)}`]) {
    assert.throws(() => identicon(bad), InvalidAddressError, `expected ${JSON.stringify(bad)} to throw`);
  }
});

test('normalizeAddress lowercases and prefixes', () => {
  assert.equal(normalizeAddress(VITALIK), VITALIK.toLowerCase());
  assert.equal(normalizeAddress(VITALIK.slice(2)), VITALIK.toLowerCase());
});

test('mini and full agree on every layer they share', () => {
  const shared = new Set<string>(MINI_LAYERS);
  for (const address of sample(200)) {
    const full = identiconOf(address);
    const mini = identiconOfMini(address);
    assert.deepEqual(
      full.choices.map((choice) => [choice.layer, choice.art.id, choice.colorway.id]),
      mini.choices.map((choice) => [choice.layer, choice.art.id, choice.colorway.id]),
      'draws must not depend on detail level',
    );
    assert.ok(shared.size > 0);
  }
});

test('mini paints only the layers whose art it imports', () => {
  assert.deepEqual(Object.keys(MINI_ART_DATA).sort(), [...MINI_LAYERS].sort());
});

test('every pixel is an opaque hex colour', () => {
  for (const address of sample(100)) {
    const { pixels } = identiconOf(address);
    assert.equal(pixels.length, CANVAS * CANVAS);
    for (const pixel of pixels) assert.match(pixel, /^#[0-9a-fA-F]{6}$/);
  }
});

// A colourway that omits a slot its art uses would surface as magenta in a wallet.
test('no address renders the missing-slot colour', () => {
  for (const address of sample(2000)) {
    assert.ok(!identiconOf(address).pixels.includes('#ff00ff'), `${address} has an unresolved slot`);
  }
});

test('every art entry in the manifest has encoded pixels', () => {
  for (const layer of LAYER_ORDER) {
    for (const art of MANIFEST[layer].art) {
      assert.ok(ART_DATA[layer]?.[art.id], `${layer}/${art.id} has no data`);
    }
  }
});

test('weights are positive integers and colourways are non-empty', () => {
  for (const layer of LAYER_ORDER) {
    const { art, colorways } = MANIFEST[layer];
    assert.ok(art.length > 0, `${layer} has no art`);
    assert.ok(colorways.length > 0, `${layer} has no colourways`);
    for (const candidate of [...art, ...colorways]) {
      assert.ok(Number.isInteger(candidate.weight) && candidate.weight >= 1, `${layer}/${candidate.id}`);
    }
  }
});

/** The layers whose tone is part of the guarantee. See spec/v1.md §3.2. */
const TONED = ['body', 'background', 'clothing', 'headwear', 'mouth', 'accessory'] as const;

test('every colourway that covers real area declares a tone', () => {
  for (const layer of TONED) {
    for (const colorway of MANIFEST[layer].colorways) {
      assert.ok(
        colorway.tone === 'deep' || colorway.tone === 'bright',
        `${layer}/${colorway.id} has no tone; see spec/v1.md §3.2`,
      );
    }
    for (const tone of ['deep', 'bright'] as const) {
      assert.ok(
        MANIFEST[layer].colorways.some((colorway) => colorway.tone === tone),
        `${layer} has no ${tone} colourway, so the opposite tone would have nothing to pair with`,
      );
    }
  }
});

test('the tone bands do not overlap', () => {
  // The guarantee in the next two tests is only as good as this gap. Deep tops out
  // well below where bright starts, for backgrounds and fur alike.
  for (const [layer, slot] of [
    ['background', 'a'],
    ['body', 'f'],
    ['clothing', 'a'],
    ['headwear', 'a'],
  ] as const) {
    const of = (tone: Tone) =>
      MANIFEST[layer].colorways.filter((c) => c.tone === tone).map((c) => lightness(c.colors[slot]!));
    assert.ok(
      Math.max(...of('deep')) < Math.min(...of('bright')),
      `${layer}: a deep colourway is lighter than a bright one`,
    );
  }
});

test('any cat is legible on any background it can be paired with', () => {
  // Every pair the generator can actually produce, which is every opposite-tone
  // pair. WCAG's 3:1 floor for graphical objects, plus a perceptual lightness gap,
  // because the ratio alone passes things that look muddy.
  for (const body of MANIFEST.body.colorways) {
    for (const background of MANIFEST.background.colorways) {
      if (background.tone === body.tone) continue;
      const fur = body.colors.f!;
      const field = background.colors.a!;
      const pair = `${body.id} on ${background.id}`;
      assert.ok(contrast(fur, field) >= 3, `${pair}: ${contrast(fur, field).toFixed(2)}:1 is under 3:1`);
      assert.ok(
        separation(fur, field) >= 0.3,
        `${pair}: lightness gap ${separation(fur, field).toFixed(2)} is under 0.30`,
      );
    }
  }
});

test('every cat has a visible face', () => {
  // Whiskers, inner ear and mouth are drawn straight onto the fur with nothing
  // else to carry them. Gated on APCA, whose Lc 30 is its own floor for a solid
  // pictogram, because neither of the other two metrics catches this: WCAG
  // collapses towards 1:1 on a dark cat whatever the colours, and a lightness gap
  // ignores that two colours the same distance apart in L can differ in luminance
  // by 1.4x. A black mouth on charcoal fur passed a 0.20 lightness gap and scored
  // Lc 0 — invisible — which is how it shipped that way.
  for (const body of MANIFEST.body.colorways) {
    const fur = body.colors.f!;
    for (const slot of ['s', 'p'] as const) {
      const line = body.colors[slot];
      assert.ok(line, `${body.id} has no '${slot}'`);
      assert.ok(apca(line, fur) >= 30, `${body.id}/${slot}: Lc ${apca(line, fur).toFixed(1)} is under 30`);
    }
    // Both are drawn straight onto the fur, so both are held to the same floor.
    // For eyewear it is the frame that has to clear it: the lens stays dark on
    // either tone, and is read from the frame around it.
    for (const layer of ['mouth', 'accessory'] as const) {
      for (const cw of MANIFEST[layer].colorways) {
        if (cw.tone === body.tone) continue;
        const lc = apca(cw.colors.o!, fur);
        assert.ok(lc >= 30, `${layer}/${cw.id} on ${body.id}: Lc ${lc.toFixed(1)} is under 30`);
      }
    }
  }
});

test('the ink line reads against whatever it borders', () => {
  // The outline is the one line allowed to vanish into the fur, and only on a deep
  // cat, where its job is different. There the silhouette is the fur against a
  // bright field and the ink is only the rim, so it is measured against the
  // background. On a bright cat it is the reverse.
  for (const body of MANIFEST.body.colorways) {
    const ink = body.colors.o!;
    if (body.tone === 'deep') {
      for (const background of MANIFEST.background.colorways) {
        if (background.tone === body.tone) continue;
        const lc = apca(ink, background.colors.a!);
        assert.ok(lc >= 30, `${body.id} ink on ${background.id}: Lc ${lc.toFixed(1)} is under 30`);
      }
    } else {
      const lc = apca(ink, body.colors.f!);
      assert.ok(lc >= 30, `${body.id} ink on its own fur: Lc ${lc.toFixed(1)} is under 30`);
    }
  }
});

test('anything the cat wears is legible against the field behind it', () => {
  // A garment reaches past the cat to the canvas edge, so it meets the background
  // as well as the fur. It takes the cat's tone, which means the backgrounds it can
  // meet are exactly the ones of the other tone.
  for (const layer of ['clothing', 'headwear'] as const) {
    for (const garment of MANIFEST[layer].colorways) {
      for (const background of MANIFEST.background.colorways) {
        if (background.tone === garment.tone) continue;
        const worn = garment.colors.a!;
        const field = background.colors.a!;
        const pair = `${layer}/${garment.id} on ${background.id}`;
        assert.ok(contrast(worn, field) >= 3, `${pair}: ${contrast(worn, field).toFixed(2)}:1 is under 3:1`);
        assert.ok(
          separation(worn, field) >= 0.3,
          `${pair}: lightness gap ${separation(worn, field).toFixed(2)} is under 0.30`,
        );
      }
    }
  }
});

test('the cat decides the tone of everything around it', () => {
  for (const address of sample(2000)) {
    const choices = identiconTraits(address);
    const tone = (layer: string) => choices.find((choice) => choice.layer === layer)!.colorway.tone;
    assert.notEqual(tone('background'), tone('body'), `${address}: cat and background share a tone`);
    assert.notEqual(tone('mouth'), tone('body'), `${address}: the mouth is the same tone as the fur`);
    assert.notEqual(tone('accessory'), tone('body'), `${address}: the eyewear is the same tone as the fur`);
    assert.equal(tone('clothing'), tone('body'), `${address}: clothing does not match the cat's tone`);
    assert.equal(tone('headwear'), tone('body'), `${address}: headwear does not match the cat's tone`);
  }
});

test('rarity roughly tracks the declared weights', () => {
  const addresses = sample(20000);
  const counts = new Map<string, number>();
  for (const address of addresses) {
    const headwear = identiconTraits(address).find((choice) => choice.layer === 'headwear')!;
    counts.set(headwear.art.id, (counts.get(headwear.art.id) ?? 0) + 1);
  }

  const layer = MANIFEST.headwear.art;
  const total = layer.reduce((sum, art) => sum + art.weight, 0);
  for (const art of layer) {
    const expected = art.weight / total;
    const actual = (counts.get(art.id) ?? 0) / addresses.length;
    assert.ok(
      Math.abs(actual - expected) < 0.02,
      `${art.id}: expected ~${expected.toFixed(3)}, saw ${actual.toFixed(3)}`,
    );
  }
});

test('run-length encoding round-trips', () => {
  const slots = Uint8Array.from([0, 0, 1, 1, 1, 2, 0, 3]);
  const decoded = decodeRle(encodeRle(slots, 4, 5, 2, 4));
  assert.equal(decoded.top, 4);
  assert.equal(decoded.left, 5);
  assert.equal(decoded.height, 2);
  assert.equal(decoded.width, 4);
  assert.deepEqual([...decoded.slots], [...slots]);
});

test('run-length encoding splits runs longer than 255', () => {
  const slots = new Uint8Array(300).fill(7);
  assert.deepEqual([...decodeRle(encodeRle(slots, 0, 0, 300 / 10, 10)).slots], [...slots]);
});

test('svg output is well formed and scalable', () => {
  const svg = identicon(VITALIK, { size: 64 });
  assert.match(svg, new RegExp(`^<svg xmlns="http://www\\.w3\\.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}"`));
  assert.match(svg, /width="64" height="64"/);
  assert.match(svg, /shape-rendering="crispEdges"/);
  assert.ok(svg.endsWith('</svg>'));
  assert.doesNotMatch(identicon(VITALIK), /^<svg[^>]*\swidth=/, 'size must be optional');
});
