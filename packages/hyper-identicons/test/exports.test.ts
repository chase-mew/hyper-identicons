import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as full from '../src/index.js';
import * as mini from '../src/mini.js';

/** The keys a consumer of `hyper-identicons` is meant to see. Everything else lives on a subpath. */
const FULL_EXPORTS = [
  'identicon',
  'identiconUri',
  'identiconOf',
  'identiconTraits',
  'InvalidAddressError',
  'isAddress',
  'normalizeAddress',
].sort();

/** `hyper-identicons/mini` exposes the same four bound functions and nothing else. */
const MINI_EXPORTS = ['identicon', 'identiconUri', 'identiconOf', 'identiconTraits'].sort();

test('the default entry point exports only the public API', () => {
  assert.deepEqual(Object.keys(full).sort(), FULL_EXPORTS);
});

test('the mini entry point exports only its four bound functions', () => {
  assert.deepEqual(Object.keys(mini).sort(), MINI_EXPORTS);
});
