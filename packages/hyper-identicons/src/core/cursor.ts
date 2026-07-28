import { keccak_256 } from '@noble/hashes/sha3';
import { addressToBytes } from './address.js';

/**
 * Consumes a keccak seed 16 bits at a time, re-hashing when the current block runs
 * out. See spec/v1.md §2.1. The budget is therefore unbounded, but layer order is
 * significant: inserting a layer shifts every draw after it.
 */
export class Cursor {
  private block: Uint8Array;
  private offset = 0;

  constructor(seed: Uint8Array) {
    this.block = seed;
  }

  static fromAddress(address: string): Cursor {
    return new Cursor(keccak_256(addressToBytes(address)));
  }

  next16(): number {
    if (this.offset === this.block.length) {
      this.block = keccak_256(this.block);
      this.offset = 0;
    }
    const value = (this.block[this.offset]! << 8) | this.block[this.offset + 1]!;
    this.offset += 2;
    return value;
  }
}
