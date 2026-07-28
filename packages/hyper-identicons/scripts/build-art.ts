/**
 * Turns the hand-authored grids in art-source/ into run-length encoded data modules.
 *
 * Every failure here is a build failure on purpose. A misaligned row or an unpainted
 * slot that silently reached runtime would show up as a magenta pixel in someone's
 * wallet, and by then the output is frozen.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeRle } from '../src/core/rle.js';
import { CANVAS, SLOT_BY_CHAR, SLOT_CHARS, TRANSPARENT } from '../src/core/slots.js';
import { COLORWAYS } from '../src/art/colorways.js';
import { LAYER_ORDER } from '../src/core/types.js';
import type { LayerId } from '../src/core/types.js';

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(here, '..');
const sourceRoot = join(packageRoot, 'art-source');
const outputRoot = join(packageRoot, 'src', 'art');

interface ArtEntry {
  id: string;
  name: string;
  weight: number;
}

interface Grid {
  top: number;
  left: number;
  rows: string[];
}

function parseGrid(text: string, label: string): Grid {
  const lines = text
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !line.startsWith('#'));

  let top = 0;
  let left = 0;
  const rows: string[] = [];

  for (const line of lines) {
    if (line.startsWith('@')) {
      const [, rawTop, rawLeft] = line.split(/\s+/);
      top = Number(rawTop);
      left = Number(rawLeft);
      if (!Number.isInteger(top) || !Number.isInteger(left)) {
        throw new Error(`${label}: malformed offset directive ${JSON.stringify(line)}`);
      }
      continue;
    }
    if (line.length > 0) rows.push(line);
  }

  if (rows.length === 0) throw new Error(`${label}: no pixel rows`);

  const width = rows[0]!.length;
  rows.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`${label}: row ${index} is ${row.length} wide, expected ${width}`);
    }
    for (const char of row) {
      if (!(char in SLOT_BY_CHAR)) {
        throw new Error(`${label}: row ${index} uses unknown slot character ${JSON.stringify(char)}`);
      }
    }
  });

  if (top + rows.length > CANVAS || left + width > CANVAS) {
    throw new Error(
      `${label}: ${width}x${rows.length} at ${left},${top} escapes the ${CANVAS}x${CANVAS} canvas`,
    );
  }

  return { top, left, rows };
}

/** Trims to the tight bounding box, which is most of the compression on small traits. */
function encodeGrid(grid: Grid, layer: LayerId, label: string): string {
  const height = grid.rows.length;
  const width = grid.rows[0]!.length;

  let minRow = height;
  let maxRow = -1;
  let minColumn = width;
  let maxColumn = -1;

  for (let row = 0; row < height; row++) {
    for (let column = 0; column < width; column++) {
      if (SLOT_BY_CHAR[grid.rows[row]![column]!] === TRANSPARENT) continue;
      if (row < minRow) minRow = row;
      if (row > maxRow) maxRow = row;
      if (column < minColumn) minColumn = column;
      if (column > maxColumn) maxColumn = column;
    }
  }

  // A fully transparent asset ("none", "plain") still needs one pixel to encode.
  if (maxRow < 0) return encodeRle(Uint8Array.of(TRANSPARENT), 0, 0, 1, 1);

  const boxHeight = maxRow - minRow + 1;
  const boxWidth = maxColumn - minColumn + 1;
  const slots = new Uint8Array(boxHeight * boxWidth);
  const used = new Set<string>();

  for (let row = 0; row < boxHeight; row++) {
    for (let column = 0; column < boxWidth; column++) {
      const char = grid.rows[minRow + row]![minColumn + column]!;
      const slot = SLOT_BY_CHAR[char]!;
      slots[row * boxWidth + column] = slot;
      if (slot !== TRANSPARENT) used.add(char);
    }
  }

  for (const colorway of COLORWAYS[layer]) {
    for (const char of used) {
      if (!(char in colorway.colors)) {
        throw new Error(
          `${label}: uses slot '${char}' but colourway '${colorway.id}' of layer '${layer}' does not define it`,
        );
      }
    }
  }

  return encodeRle(slots, grid.top + minRow, grid.left + minColumn, boxHeight, boxWidth);
}

const manifestPath = join(sourceRoot, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  layers: Record<LayerId, ArtEntry[]>;
};

mkdirSync(join(outputRoot, 'data'), { recursive: true });

let totalBytes = 0;
const summary: string[] = [];

for (const layer of LAYER_ORDER) {
  const entries = manifest.layers[layer];
  if (!entries?.length) throw new Error(`manifest.json: layer '${layer}' has no art`);

  const directory = join(sourceRoot, layer);
  const onDisk = new Set(
    readdirSync(directory)
      .filter((file) => file.endsWith('.txt'))
      .map((file) => file.replace(/\.txt$/, '')),
  );

  const encoded: Record<string, string> = {};
  for (const entry of entries) {
    if (!onDisk.delete(entry.id)) {
      throw new Error(`manifest.json lists '${layer}/${entry.id}' but ${entry.id}.txt does not exist`);
    }
    if (!Number.isInteger(entry.weight) || entry.weight < 1) {
      throw new Error(`manifest.json: '${layer}/${entry.id}' has weight ${entry.weight}, must be >= 1`);
    }
    const label = `${layer}/${entry.id}.txt`;
    const grid = parseGrid(readFileSync(join(directory, `${entry.id}.txt`), 'utf8'), label);
    encoded[entry.id] = encodeGrid(grid, layer, label);
  }

  if (onDisk.size > 0) {
    throw new Error(`Unlisted art in art-source/${layer}: ${[...onDisk].join(', ')}`);
  }

  const bytes = Object.values(encoded).reduce((sum, data) => sum + data.length, 0);
  totalBytes += bytes;
  summary.push(`  ${layer.padEnd(11)} ${String(entries.length).padStart(2)} assets  ${String(bytes).padStart(5)} B`);

  const body = Object.entries(encoded)
    .map(([id, data]) => `  ${JSON.stringify(id)}: '${data}',`)
    .join('\n');
  writeFileSync(
    join(outputRoot, 'data', `${layer}.ts`),
    `// Generated by scripts/build-art.ts from art-source/${layer}. Do not edit.\n` +
      `export const ${layer}: Record<string, string> = {\n${body}\n};\n`,
  );
}

const manifestBody = LAYER_ORDER.map((layer) => {
  const art = manifest.layers[layer]
    .map((entry) => `      { id: ${JSON.stringify(entry.id)}, name: ${JSON.stringify(entry.name)}, weight: ${entry.weight} },`)
    .join('\n');
  return `  ${layer}: {\n    id: '${layer}',\n    art: [\n${art}\n    ],\n    colorways: COLORWAYS.${layer},\n  },`;
}).join('\n');

writeFileSync(
  join(outputRoot, 'manifest.ts'),
  `// Generated by scripts/build-art.ts from art-source/manifest.json. Do not edit.\n` +
    `import type { Manifest } from '../core/types.js';\n` +
    `import { COLORWAYS } from './colorways.js';\n\n` +
    `export const MANIFEST: Manifest = {\n${manifestBody}\n};\n`,
);

const combinations = LAYER_ORDER.reduce(
  (product, layer) => product * manifest.layers[layer].length * COLORWAYS[layer].length,
  1,
);

console.log('Encoded art:');
console.log(summary.join('\n'));
console.log(`  ${'total'.padEnd(11)} ${String(totalBytes).padStart(11)} B base64`);
console.log(`  distinct combinations: ${combinations.toLocaleString('en-US')}`);
console.log(`  slots defined: ${SLOT_CHARS.length}`);
