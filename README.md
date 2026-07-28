# Hyper Identicons

A deterministic pixel-art cat for every HyperEVM address. The same address always
renders the same character, in any app, with no network call, no account and no upload.

> **Spec v1 is a draft and the output is not frozen.** Any address may render
> differently between releases until `spec/v1.md` says Frozen. Don't ship this to users
> who will grow attached to their avatar yet.

```ts
import { identicon, identiconUri } from 'hyper-identicons';

identicon('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045');            // SVG string
identiconUri('0xd8dA…6045', { size: 40, radius: 16 });              // data: URI
```

```tsx
import { HyperIdenticon } from '@hyper-identicons/react';

<HyperIdenticon address={address} size={32} detail="mini" />;
```

## Why it is built this way

**Rendered locally, not fetched.** Wallets and explorers draw a hundred avatars in a
scrolling list; none of them will accept a network request per row, and an address
lookup service would learn who is watching whom. The library is the product. An HTTP
API is a possible second surface for Discord bots and social embeds, not the main path.

**Art is run-length encoded pixel data, not PNGs or hand-drawn SVG.** Artists still
draw pixels; a build step compresses them. The entire trait set is currently ~1.3 KB.

**One body silhouette, many colourways.** Shape and colour are drawn independently, so
a garment is drawn once and composites onto every cat by construction. Ten fur
colourways cost one drawing. This is also why there is no class of bug where a hoodie
fits one body and not another.

**Two detail levels.** `mini` paints background, body, eyes and headwear only, and
never imports the art it drops. Its render agrees with `full` on every layer they
share, so an address is recognisably the same character at both.

**Legibility is guaranteed, not hoped for.** Fur and backgrounds are split into a deep
band and a bright band with a wide gap between them, and the background is always drawn
from the band the cat did not take. No address can produce a cat that sinks into its own
backdrop. `AGENTS.md` has the reasoning and the numbers; `scripts/audit-colors.ts`
prints them and the test suite enforces them.

## Layout

| Path | What it is |
|---|---|
| `AGENTS.md` | Working notes: the art pipeline, the colour system, known gaps. |
| `spec/v1.md` | The normative spec. Any port must match it byte for byte. |
| `spec/vectors.json` | Addresses pinned to their traits and output hashes. |
| `packages/hyper-identicons` | The library: engine, art data, both entry points. |
| `packages/react` | `<HyperIdenticon />`. |
| `apps/playground` | Address inspector, legibility sheet, trait explorer. |

Inside the library, `src/core` is the engine and knows nothing about cats;
`art-source/` holds the pixel grids; `src/art/` is generated from them and is
not edited by hand.

The grids themselves come out of `tools/`. `trace-reference.py` downsamples the
reference art onto the canvas grid; `make-body.py` turns that trace into the cat
and publishes its landmarks to `tools/anchors.json`; `make-traits.py` reads
those anchors and places every other trait against them. Run `make-body.py`
before `make-traits.py`. Editing the `.txt` files directly works, but the next
generator run will overwrite them.

The cat is a three-quarter view, which drives more of the layout than it looks.
The skull is centred on column 23 but the muzzle sits five columns right of it,
so anything that lands on the face carries a `shift`. The near ear is drawn in
full and the far one is foreshortened. `tools/peek.py` prints a labelled
sub-rectangle of any grid, which is the fastest way to read exact coordinates
back off a trace.

## Working on it

```sh
pnpm install
pnpm dev          # playground on :5173
pnpm build:art    # re-encode art-source/ after editing a grid
pnpm test
```

Drawing a new trait: describe it in `tools/make-traits.py`, list it in
`art-source/manifest.json`, run `pnpm build:art`. A grid is slot characters (see
`spec/v1.md` §4.2), optionally preceded by `@ <top> <left>` to place a small asset on
the 48×48 canvas. The encoder trims to the bounding box, so the offset is a
convenience, not a requirement.

The build fails loudly on ragged rows, unknown slot characters, art that escapes the
canvas, files missing from the manifest, and any slot a colourway does not define.
That last one matters: an undefined slot would otherwise reach a user's wallet as a
magenta pixel, and by then the output is frozen.

## Licence

Code MIT. Art CC0 — copy it, fork it, ship it, no attribution required.

The art is original and this project is unofficial and unaffiliated with the Hyper
Foundation. It is not derived from Hypurr, whose artwork is not CC0: the Foundation
retains the underlying IP and individual holders hold enforceable licences to their
specific character. Keep new traits clearly distinct from that collection.

A few traits quote Hyperliquid deliberately and should be understood as fan work: the
`hoodie-h` garment and `cap-h` headwear carry an H, and the `frost` fur uses the pale
blue the ecosystem shades its cat with. Neither is a licensed use.
