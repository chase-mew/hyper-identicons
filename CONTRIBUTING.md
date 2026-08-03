# Contributing

Thanks for taking an interest. This is a small project with an unusual shape — most
of what looks like source is generated — so this page is mainly about which files
you are meant to edit.

## Getting set up

```sh
pnpm install
pnpm build      # encodes the art, then compiles both packages
pnpm test
pnpm dev        # playground on :5173
```

Node 22 or newer, and pnpm 9. The Python tooling under `tools/` needs Python 3.9+
and, for the preview renderers only, `pip install -r tools/requirements.txt`.

## Which files are generated

Quite a few, and editing the wrong one means your work disappears on the next build:

| Generated | Edit this instead |
|---|---|
| `packages/hyper-identicons/art-source/**/*.txt` | `tools/make-body.py`, `tools/make-backgrounds.py`, `tools/make-traits.py` |
| `packages/hyper-identicons/src/art/data/*.ts` | the `.txt` grids, then run `pnpm build:art` |
| `packages/hyper-identicons/src/art/manifest.ts` | `packages/hyper-identicons/art-source/manifest.json` |
| `spec/vectors.json` | nothing — run `pnpm vectors` after any change to output |
| `tools/anchors.json` | `tools/make-body.py` |
| `docs/*.png` | see [Documentation images](#documentation-images) |

CI checks all of these: it re-runs the generators and fails if the committed output
differs, so a half-regenerated change cannot merge.

## Adding a trait

1. Draw it in `tools/make-traits.py`. The helpers there — `inked()`, `hat()`,
   `garment()`, `merge()` — do most of the work, and skipping them is visible
   immediately. `AGENTS.md` has a long section on what does and does not survive at
   48 pixels; it is worth reading before you start rather than after.
2. List it in `packages/hyper-identicons/art-source/manifest.json` with a weight.
3. Run `python3 tools/make-body.py && python3 tools/make-traits.py`, then
   `pnpm build:art`, then `pnpm vectors`.
4. Look at it at native size, not just blown up:
   ```sh
   cd packages/hyper-identicons
   npx tsx scripts/trait-shots.ts    # every trait, native size beside a blow-up
   npx tsx scripts/sheet.ts          # forty whole identicons
   npx tsx scripts/pairs.ts eyes mouth
   ```
   The last one is the only view that catches traits which are each fine alone and
   wrong together.

The build refuses ragged rows, unknown slot characters, art that runs off the canvas,
files missing from the manifest, and any slot a colourway leaves undefined.

## Adding or changing a colour

Read the Colour section of `AGENTS.md` first — it is the part of this project most
likely to be got wrong by eye, and the reasoning is not guessable from the code.

The short version: pick the lightness first with `fromOklch(L, C, H)` in
`scripts/color.ts`, then choose the hue. Never pick a colour by eye. Then:

```sh
cd packages/hyper-identicons
npx tsx scripts/audit-colors.ts   # every contrast the palette has to survive
npx tsx scripts/headroom.ts       # how much room is left, and what is holding it
```

The audit must report zero failures. The same thresholds are asserted in the test
suite, so a colour that makes the cat invisible fails the build rather than shipping.

## Documentation images

`docs/sheet.png` and `docs/base.png` are the only rendered images the repository
keeps. Regenerate them when the art changes:

```sh
cd packages/hyper-identicons
npx tsx scripts/render-base.ts 12
npx tsx scripts/sheet.ts 8 5 ../../docs/sheet.png
```

Everything else the scripts produce lands in `tools/out/`, which is ignored.

## The spec

`spec/v1.md` is normative: any port in any language has to match it byte for byte.
If you change what an address renders to, change the spec in the same commit and
run `pnpm vectors` to refresh the conformance file.

Spec v1 is still a draft, so output is allowed to change. Once it is frozen, it
isn't.

## Pull requests

Keep the diff to the thing you set out to change. Run `pnpm build`, `pnpm typecheck`
and `pnpm test` before opening the PR, and say in the description what you looked at
to convince yourself the art still reads — for art changes, a screenshot of the
relevant sheet is worth more than any description.

Commit messages here are written as a sentence saying what the commit does, in the
imperative and without a prefix: "Sit the beanie down on the cat's head".
