import assert from 'node:assert/strict';
import { test } from 'node:test';
import { keccak_256 } from '@noble/hashes/sha3';
import { MANIFEST } from '../src/art/manifest.js';
import { identiconTraits } from '../src/index.js';
import { LAYER_ORDER } from '../src/core/types.js';
import type { LayerId } from '../src/core/types.js';

function sample(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const digest = Buffer.from(keccak_256(`select/${index}`)).toString('hex');
    return `0x${digest.slice(0, 40)}`;
  });
}

const rules = LAYER_ORDER.flatMap((layer) =>
  MANIFEST[layer].art.flatMap((art) => (art.excludes ?? []).map((pair) => ({ layer, art: art.id, pair }))),
);

test('every exclusion names art that exists', () => {
  for (const { layer, art, pair } of rules) {
    const target = MANIFEST[pair.layer];
    assert.ok(target, `${layer}/${art} excludes unknown layer '${pair.layer}'`);
    assert.ok(
      target.art.some((other) => other.id === pair.art),
      `${layer}/${art} excludes '${pair.layer}/${pair.art}', which does not exist`,
    );
  }
});

/**
 * The selector falls back to the unfiltered list rather than throw, so a manifest
 * that could strand a layer would not fail loudly — it would quietly ship the very
 * pair the rule forbids. This is the check that keeps that honest, and it has to
 * consider every combination of the layers involved rather than only the ones a
 * sample happens to produce.
 */
test('no combination of rules can leave a layer with nothing to draw', () => {
  for (const layer of LAYER_ORDER) {
    const constrained = MANIFEST[layer].art.filter((art) =>
      rules.some((rule) => (rule.layer === layer && rule.art === art.id) || rule.pair.layer === layer),
    );
    if (constrained.length === 0) continue;

    // The worst case is every other layer landing on whichever art excludes the
    // most here, so build that face directly instead of hoping to sample it.
    const worst = new Map<LayerId, string>();
    for (const other of LAYER_ORDER) {
      if (other === layer) continue;
      const hostile = MANIFEST[other].art.filter((art) =>
        rules.some(
          (rule) =>
            (rule.layer === other && rule.art === art.id && rule.pair.layer === layer) ||
            (rule.pair.layer === other && rule.pair.art === art.id && rule.layer === layer),
        ),
      );
      if (hostile.length > 0) worst.set(other, hostile[0]!.id);
    }

    const survivors = MANIFEST[layer].art.filter(
      (art) =>
        ![...worst].some(
          ([other, otherArt]) =>
            art.excludes?.some((p) => p.layer === other && p.art === otherArt) ||
            MANIFEST[other].art.find((x) => x.id === otherArt)?.excludes?.some((p) => p.layer === layer && p.art === art.id),
        ),
    );
    assert.ok(survivors.length > 0, `every ${layer} is excluded when worn with ${JSON.stringify([...worst])}`);
  }
});

test('no address is drawn with an excluded pair', () => {
  const drawn = new Map<LayerId, Set<string>>(LAYER_ORDER.map((layer) => [layer, new Set()]));

  for (const address of sample(4000)) {
    const choices = identiconTraits(address);
    const by = new Map(choices.map((choice) => [choice.layer, choice.art.id]));
    for (const [layer, art] of by) drawn.get(layer)!.add(art);
    for (const { layer, art, pair } of rules) {
      assert.ok(
        !(by.get(layer as LayerId) === art && by.get(pair.layer) === pair.art),
        `${address} drew ${layer}/${art} with ${pair.layer}/${pair.art}`,
      );
    }
  }

  // A rule that excluded too much would pass the assertion above by never letting
  // the trait be drawn at all, so check the constrained art still turns up.
  for (const { layer, art } of rules) {
    assert.ok(drawn.get(layer as LayerId)!.has(art), `${layer}/${art} was never drawn in 4000 addresses`);
  }
});
