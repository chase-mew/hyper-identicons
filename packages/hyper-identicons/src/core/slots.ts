/** Semantic colour slots. See spec/v1.md §4.2. Slot 0 is transparent. */
export const SLOT_CHARS = [
  '.', // 0  transparent
  'o', // 1  outline
  'f', // 2  fur, base
  's', // 3  fur shadow / whisker line
  'l', // 4  fur, light
  'p', // 5  inner ear
  'a', // 6  item primary
  'b', // 7  item secondary
  'c', // 8  item tertiary / metal
  'w', // 9  white
  'k', // 10 black
  'h', // 11 Hyperliquid aquamarine
  'g', // 12 glass / lens
  'e', // 13 eye white
  'i', // 14 iris
] as const;

export type SlotChar = (typeof SLOT_CHARS)[number];

export const TRANSPARENT = 0;

export const SLOT_BY_CHAR: Record<string, number> = Object.fromEntries(
  SLOT_CHARS.map((char, index) => [char, index]),
);

export const CANVAS = 48;
