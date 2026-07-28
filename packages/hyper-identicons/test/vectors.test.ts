import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { identicon, identiconTraits } from '../src/index.js';
import { identicon as identiconMini } from '../src/mini.js';

const vectorsPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'spec', 'vectors.json');

interface Vector {
  address: string;
  traits: Record<string, string>;
  svgSha256: { full: string; mini: string };
}

const { version, vectors } = JSON.parse(readFileSync(vectorsPath, 'utf8')) as {
  version: string;
  vectors: Vector[];
};

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

test('conformance vectors still hold', () => {
  assert.equal(version, 'v1');
  assert.ok(vectors.length > 0);

  for (const vector of vectors) {
    const traits = Object.fromEntries(
      identiconTraits(vector.address).map((choice) => [choice.layer, `${choice.art.id}/${choice.colorway.id}`]),
    );
    assert.deepEqual(traits, vector.traits, `traits drifted for ${vector.address}`);
    assert.equal(sha256(identicon(vector.address)), vector.svgSha256.full, `full svg drifted for ${vector.address}`);
    assert.equal(sha256(identiconMini(vector.address)), vector.svgSha256.mini, `mini svg drifted for ${vector.address}`);
  }
});
