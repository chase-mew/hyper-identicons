const HEX_40 = /^[0-9a-f]{40}$/;

export class InvalidAddressError extends Error {
  constructor(input: string) {
    super(`Not a 20-byte hex address: ${JSON.stringify(input)}`);
    this.name = 'InvalidAddressError';
  }
}

/** Lowercase, 0x-prefixed. EIP-55 casing carries no information. See spec/v1.md §1. */
export function normalizeAddress(input: string): string {
  const body = input.replace(/^0[xX]/, '').toLowerCase();
  if (!HEX_40.test(body)) throw new InvalidAddressError(input);
  return `0x${body}`;
}

export function addressToBytes(input: string): Uint8Array {
  const body = normalizeAddress(input).slice(2);
  const bytes = new Uint8Array(20);
  for (let i = 0; i < 20; i++) {
    bytes[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function isAddress(input: string): boolean {
  return HEX_40.test(input.replace(/^0[xX]/, '').toLowerCase());
}
