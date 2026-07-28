# Working notes

Things worth knowing before changing anything here, and the reasoning behind
decisions that look arbitrary from the outside. Keep it current: if you work
something out the hard way, write it down here so the next session starts where
this one finished.

## The project in one paragraph

A deterministic identicon: a wallet address in, a pixel-art cat out, the same
cat every time, with no network call. The core is an npm library; an API is a
secondary distribution channel. Art is authored as ASCII grids of semantic slot
characters, encoded run-length into base64, and coloured at render time by a
palette drawn from the address. `spec/v1.md` is normative and still a draft —
output is allowed to change until it is frozen.

## Layout

| Path | What it is |
|---|---|
| `packages/hyper-identicons/src/core/` | the algorithm: seeding, selection, render, SVG |
| `packages/hyper-identicons/src/art/` | the manifest, the colourways, the encoded pixels |
| `packages/hyper-identicons/art-source/` | the ASCII grids, generated and committed |
| `packages/hyper-identicons/scripts/` | dev-only: art build, previews, palette audit |
| `tools/` | Python art authoring — the generators that write `art-source/` |
| `spec/v1.md` | normative spec, plus `spec/vectors.json` conformance vectors |
| `apps/playground/` | the review site |

## Art pipeline

The `.txt` grids under `art-source/` are **generated**. Editing them by hand
works until the next generator run overwrites it. The generators are:

```bash
python3 tools/make-body.py      # the cat; also writes tools/anchors.json
python3 tools/make-traits.py    # everything else, placed against those anchors
```

Run `make-body.py` first: `make-traits.py` reads the anchors it publishes, which
is what stops the body and the things worn on it drifting apart. Then
`pnpm build:art` re-encodes, and `pnpm vectors` refreshes the conformance file.

Both generators must be idempotent. Run them twice and diff before committing;
a generator that produces different output on a second run has state in it.

Useful while iterating:

```bash
python3 tools/preview.py body/base mouth/smile eyes/round   # composite to PNG
python3 tools/trait-sheet.py                                # every trait, labelled
python3 tools/peek.py <grid> --rows 20:30 --cols 8:44       # exact coordinates
cd packages/hyper-identicons && npx tsx scripts/render-base.ts   # root PNG
```

### The cat is a three-quarter view

This drives more of the layout than it looks. The skull is centred on column 23
but the muzzle sits four columns right of it, so anything landing on the face
carries a `shift`. The near ear is drawn full size, the far one foreshortened.
The whole cat is offset one row down the canvas by a `DROP` constant applied when
the grids are rasterised, so the span tables stay in the coordinates they were
traced in.

The reference image is `2026-07-28 11.49.26.jpg`. Where the reference hides the
cat — the crown under the cap, the lower far ear, the shoulders under the hoodie
— the geometry is reconstructed and the code says so.

---

# Colour

The part most likely to be got wrong by eye. Read this before touching
`src/art/colorways.ts`.

## The problem

Two failures, and they pull in opposite directions:

1. **External.** The cat has to separate from the background. Any fur can land
   on any background, so this is a claim about every pair, not about a few.
2. **Internal.** The outline, whiskers, inner ear, eyes and mouth are drawn *on*
   the fur, so they have to separate from the fur. A near-black cat with a black
   outline has no face — the pixels are all there and none of them are visible.

Fixing one by moving a colour usually breaks the other. Lighten the black cat
until its outline shows and it starts to merge with dark backgrounds.

## Why the obvious approach cannot work

Requiring `|L_fur − L_background| ≥ T` for *every* pair forces the two sets into
separated lightness intervals — all fur above all backgrounds, or all below.
That means giving up either dark cats or light backgrounds. There is no
arrangement of a free-choice palette that keeps both. This is a structural fact,
not a tuning problem, and it is worth re-deriving before anyone proposes going
back to independent draws.

## The system: tone pairing

Every colourway that has to be told apart from something declares a `tone`,
`deep` or `bright`. The body draws freely and everything else follows from it.

There is one rule underneath it: **take the tone opposite whatever you are drawn
against.**

| Layer | Drawn against | Tone |
|---|---|---|
| `body` | — | free |
| `background` | the cat | opposite the cat |
| `mouth` | the fur | opposite the cat |
| `clothing`, `headwear` | the background | opposite the background, so *the same as* the cat |

Garments looking like the exception are not one. A hoodie or a cap reaches past
the cat to the canvas edge, so the neighbour it has to clear is the field; being
the opposite of the field lands it back on the cat's own tone.

This is why `body` is drawn before everything else despite being painted second —
see `SELECT_ORDER` and `toneFor` in `core/`, and `spec/v1.md` §3.2.

Bands, in OKLab lightness:

| Role | Tone | L range |
|---|---|---|
| background | deep | 0.14 – 0.25 |
| background | bright | 0.87 – 0.96 |
| fur | deep | 0.34 – 0.42 |
| fur | bright | 0.78 – 0.97 |
| garment | deep | 0.15 |
| garment | bright | 0.60 |
| mouth line | deep | 0.19 – 0.35 |
| mouth line | bright | 0.72 – 0.74 |

The gap between what a cat can be and what it can stand on is never smaller than
0.45 in lightness, roughly 5.7:1 by WCAG. Comfortably past the 3:1 floor for
graphical objects, and it shows: the identicons have a consistent tonal drama
rather than a lucky-dip of clashes.

Two consequences worth knowing before you move anything:

- **Deep fur stops at L 0.34** and does not go to true black. Below that there is
  no room underneath it for an ink line and the cat loses its own face. This is
  the answer to "the black cat is too dark": a charcoal cat with a black outline,
  not a black cat with a lighter outline, because a light outline stops reading
  as ink.
- **Garments are pinned from both sides** — above the background, below the fur —
  so they sit at a single lightness per tone rather than a range. That is also
  why bright garments are saturated mid-tones rather than pastels, and why the
  deep background ceiling is 0.25 rather than 0.29: lowering it is what buys the
  bright garments enough room to be colours instead of greys. Chroma is pushed to
  near the sRGB gamut cusp at those lightnesses to compensate.

## Measuring

Three metrics. Each one passes something the others correctly reject, so which
one you reach for depends on the question.

- **WCAG 2.x contrast ratio** — the industry floor, 3:1 for graphical objects.
  Fine for the external check, and the number to quote if someone asks. **Never
  gate internal detail on it.** The `+0.05` flare term in
  `(L1+0.05)/(L2+0.05)` means two dark colours score near 1:1 however different
  they look, so it passes and fails almost at random down there.
- **OKLab lightness difference** — perceptually uniform, and the right axis to
  *design* on: pick the lightness first, then the hue. But it is **not a
  guarantee**. Two colours at the same OKLab L can differ in luminance by about
  1.4×, because L folds in the cone responses rather than tracking luminance.
- **APCA Lc** — built to predict whether a thing is actually visible, with an
  explicit soft clamp at the dark end. This is the acceptance test. Read it as:
  under 15 invisible, **30 is APCA's own floor for a solid pictogram**, 45 is a
  well-behaved 3:1, 60 is body-text grade.

Thresholds in force:

| Relationship | Floor |
|---|---|
| fur vs background, garment vs background | ≥ 3:1 **and** ≥ 0.30 ΔL |
| whiskers, inner ear, mouth vs fur | ≥ Lc 30 |
| ink line vs whatever it borders (see below) | ≥ Lc 30 |
| garment vs fur | ≥ 0.12 ΔL, a soft floor |

**Learn from this one.** A black mouth on charcoal fur cleared a 0.20 lightness
gap and scored **Lc 0** — formally invisible — and shipped that way, because the
palette was gated on ΔL alone. Design on lightness, accept on APCA. The
combination space is small and fully enumerable, so there is no excuse for not
checking all of it.

Garment against fur is soft on purpose. It is an internal boundary rather than a
silhouette, the garment has little room left once it is pinned between the
background and the fur, and the two are always far apart in hue, which carries
the edge where lightness alone would not.

### The ink line is measured against different things on each tone

On a **bright** cat the ink reads against the fur (Lc 63–97) and disappears into
the deep field behind it — which is fine, because the fur against that field is
what carries the silhouette. On a **deep** cat it is exactly reversed: the ink
vanishes into the fur (Lc 0–14) and reads against the bright field (Lc 80),
where it is the silhouette. So the audit checks each against the thing it
actually borders, and the deep cat's Lc 0 against its own fur is expected rather
than a failure.

Nothing else gets that latitude. Whiskers, inner ear and mouth have no second
edge to fall back on, which is why on a deep cat all three flip to lighter than
the fur instead of darker.

The eyes need no rule at all, and it is worth knowing why: each polarity rescues
itself. On a deep cat the white sclera reads (Lc 94–101) where the eye outline
cannot; on a bright cat the outline reads (Lc 63–99) where the sclera cannot.

```bash
cd packages/hyper-identicons && npx tsx scripts/audit-colors.ts
```

prints every contrast the palette has to survive. The same thresholds are
asserted in `test/identicon.test.ts`, so the build fails rather than the cat
quietly going invisible. **Do not add a colour by eye.** Pick the lightness
first with `fromOklch(L, C, H)` in `scripts/color.ts`, then choose the hue.

## Hues

Anchored on Hyperliquid, whose entire identity sits on OKLab hue ~180:

| Name | Hex | L | Note |
|---|---|---|---|
| Aquamarine | `#97FCE4` | 0.92 | the brand colour; the `h` slot everywhere |
| Foam | `#F5FEFD` | 0.99 | |
| Dolphin | `#DBFBF6` | 0.96 | |
| Teal | `#539B8C` | 0.64 | |
| Firefly | `#0F3933` | 0.31 | |
| Deep | `#072723` | 0.25 | |
| Ebony | `#04060C` | 0.12 | |

Bounce contributes the violet axis at hue ~285–300: `#6753F1`, `#9E88F8`,
`#D4BDFF`, and the indigo `#242047`. Both were read out of the live CSS
(`bounce.tech` names the Hyperliquid ones explicitly as `--hl-*`).

Around those, a small spread of warm and cool neighbours so a wallet does not
always land on teal. Chroma is kept low on backgrounds — they are a field behind
a character, not a subject — and allowed higher on fur.

## Known gaps

- **Accessories carry no tone.** Eyewear is the one that could arguably outgrow
  that: lenses cover a lot of a small face. Eyes are genuinely fine without one
  for the reason above.
- **A two-tone keyline was considered and not taken.** Wrapping the cat in an ink
  line plus a light halo guarantees Lc ≥ 50.8 against *any* sRGB colour, which
  would decouple the background from the fur entirely and let every layer draw
  independently again. It was rejected because it costs a pixel a side of a
  48-pixel canvas and commits to a sticker look the reference art does not have —
  not because it does not work. Revisit it if trait independence ever matters
  more than the silhouette.
- **Slot `l` (fur, light) is dead.** No art references it. It is still in
  `SLOT_CHARS`, because removing it would renumber every slot and invalidate all
  encoded art, so it is cheaper to leave it than to remove it.
- **Trait/colourway pairs are not checked for taste**, only for contrast. A
  legible combination can still be ugly.
