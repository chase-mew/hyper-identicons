import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keccak_256 } from '@noble/hashes/sha3';
import { MANIFEST } from '../src/art/manifest.js';
import { ART_DATA, identicon, identiconOf, identiconTraits } from '../src/index.js';
import { MINI_ART_DATA, identiconOf as identiconOfMini } from '../src/mini.js';
import { InvalidAddressError, decodeRle, encodeRle, normalizeAddress } from '../src/core/index.js';
import { CANVAS } from '../src/core/slots.js';
import { LAYER_ORDER, MINI_LAYERS } from '../src/core/types.js';

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
