/**
 * Regenerates spec/vectors.json.
 *
 * These pin v1's output. Once the spec is Frozen, a diff here means a port has drifted
 * or someone has silently changed every user's avatar — run this only when the version
 * namespace changes.
 */
import { writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keccak_256 } from '@noble/hashes/sha3';
import { identicon, identiconTraits } from '../src/index.js';
import { identicon as identiconMini } from '../src/mini.js';
import { CANVAS } from '../src/core/slots.js';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'spec', 'vectors.json');

const addresses = [
  '0x0000000000000000000000000000000000000000',
  '0x0000000000000000000000000000000000000001',
  '0xffffffffffffffffffffffffffffffffffffffff',
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  '0x000000000000000000000000000000000000dEaD',
  ...Array.from({ length: 27 }, (_, index) => {
    return `0x${Buffer.from(keccak_256(`vector/${index}`)).toString('hex').slice(0, 40)}`;
  }),
];

const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

const vectors = addresses.map((address) => ({
  address: address.toLowerCase(),
  traits: Object.fromEntries(
    identiconTraits(address).map((choice) => [choice.layer, `${choice.art.id}/${choice.colorway.id}`]),
  ),
  svgSha256: { full: sha256(identicon(address)), mini: sha256(identiconMini(address)) },
}));

writeFileSync(
  outPath,
  `${JSON.stringify({ version: 'v1', canvas: CANVAS, note: 'See spec/v1.md §7. Regenerate only when the version namespace changes.', vectors }, null, 2)}\n`,
);

console.log(`spec/vectors.json  ${vectors.length} vectors`);
