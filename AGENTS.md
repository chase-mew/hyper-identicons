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
npx tsx scripts/faces.ts [accessory]                        # every mouth x eyes
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
| `mouth`, `accessory` | the fur | opposite the cat |
| `clothing`, `headwear` | the background | opposite the background, so *the same as* the cat |

For eyewear only the **frame** flips. The lens stays dark on both tones, because light
lenses are ski goggles rather than shades, and the frame is the part a silhouette gets
read from anyway.

Garments looking like the exception are not one. A hoodie or a cap reaches past
the cat to the canvas edge, so the neighbour it has to clear is the field; being
the opposite of the field lands it back on the cat's own tone.

This is why `body` is drawn before everything else despite being painted second —
see `SELECT_ORDER` and `toneFor` in `core/`, and `spec/v1.md` §3.2.

Bands, in OKLab lightness:

| Role | Tone | L range |
|---|---|---|
| background | deep | 0.34 – 0.35 |
| background | bright | 0.87 – 0.96 |
| fur | deep | 0.52 – 0.54 |
| fur | bright | 0.78 – 1.00 |
| garment | deep | 0.38 – 0.39 |
| garment | bright | 0.65 |
| mouth line | deep | 0.19 – 0.35 |
| mouth line | bright | 0.80 – 0.81 |

The gap between what a cat can be and what it can stand on is never smaller than
0.35 in lightness, 3.5:1 by WCAG. Past the 3:1 floor for graphical objects, and
it shows: the identicons have a consistent tonal drama rather than a lucky-dip of
clashes.

Every deep band is now within about 0.02 of its ceiling, so "make this brighter"
is no longer a free move — it is a request to move something in the bright half
first. `npx tsx scripts/headroom.ts` solves the coupling and prints each ceiling
with the thing that sets it, which is worth reading before proposing a lift.

Four consequences worth knowing before you move anything:

- **The deep half is not the dark half.** Deep backgrounds sit at L 0.345, deep
  garments at 0.385 and deep fur at 0.52-0.54, all far above where they started.
  The first version put them at 0.14 and 0.34, on the reasoning that more
  separation is always better, and the result was a set that looked grubby:
  near-black is not read as a dark colour, it is read as an absence of light, and
  a hue at L 0.14 has no chroma left to carry it. Deep and bright never share an
  identicon, so the only thing the deep band has to clear is the bright band
  opposite it. Spend that room.
- **Dullness is chroma, not lightness, and chroma is the one axis no threshold
  constrains.** This is the trap. Every gate in the audit is a lightness or a
  luminance ratio, so a palette can pass all of them and still look like mud —
  which is what happened: the deep colours ran at chroma 0.01-0.09 against a
  gamut that would hold 0.05-0.20, and the most frequently drawn background and
  the most frequently drawn garment were both under 0.03, which is grey. There is
  no measurement that catches this. Check the cusp column in `headroom.ts` and
  ask why anything sits far below it.
- **A cold hue cannot be saturated down there, and no amount of tuning changes
  that.** sRGB holds chroma 0.058 at hue 195 and 0.194 at hue 290 for the same
  L 0.345. The teal backgrounds are at their cusp and still look quiet next to
  the violets; that is gamut, and the fix is weighting rather than colour. The
  deep set was 58% Ebony, Abyss and Firefly — one grey and two hues that cannot
  hold colour — which made the *average* tile dull however good the palette was.
- **Garments are pinned from both sides** — above the background, below the fur —
  so they sit at a single lightness per tone rather than a range. Bright fabric is
  at L 0.653 because the lowest bright fur is Ginger at 0.781 and the soft floor
  against fur is 0.12; that one number is what fixes the whole bright row. Deep
  fabric is pinned the same way and fur is the binding side by a distance, which
  means **the only way to lift a deep garment is to lift the deep fur above it**.
  Chroma is pushed to near the sRGB gamut cusp at those lightnesses.
- **Trim is where garments go neon.** A deep fabric at L 0.15 with a seam at
  L 0.55 and chroma 0.20 does not read as a lit seam, it reads as a lit sign: the
  jump is too big and the saturation has nothing to sit against. Deep fabric now
  runs at 0.385 with trim at 0.515 and cord at 0.635, even steps rather than one
  jump across a void, and the garments look like fabric. The same applies to the
  brand mint: aquamarine at L 0.92 laid straight onto a lens at 0.14 was the most
  neon thing the palette could produce, so deep eyewear gets a muted version and
  only the logo keeps the real one.

Lifting a band drags its details with it. Deep fur going up cost Void its
whiskers, which had been comfortable at Lc 37 and landed on 28 against the new
coat. Run the audit after moving any fur, not just after moving a line.

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
cd packages/hyper-identicons
npx tsx scripts/audit-colors.ts # every contrast, and what fails
npx tsx scripts/headroom.ts     # every ceiling, and what sets it
```

The first prints every contrast the palette has to survive. The same thresholds
are asserted in `test/identicon.test.ts`, so the build fails rather than the cat
quietly going invisible. **Do not add a colour by eye.** Pick the lightness
first with `fromOklch(L, C, H)` in `scripts/color.ts`, then choose the hue.

The second answers the question the audit cannot: not "does this pass" but "how
much room is left, and what is holding it". The bands are coupled tightly enough
that this is not obvious by inspection — a deep garment is bounded by the deep
fur, which is bounded by the bright backgrounds — and the WCAG bound on fur bites
before the lightness one, so solving it by hand tends to give the wrong answer.

## Hues

Anchored on Hyperliquid, whose entire identity sits on OKLab hue ~180:

| Name | Hex | L | Note |
|---|---|---|---|
| Aquamarine | `#97FCE4` | 0.92 | the brand colour; the `h` slot everywhere |
| Foam | `#F5FEFD` | 0.99 | |
| Dolphin | `#DBFBF6` | 0.96 | |
| Teal | `#539B8C` | 0.64 | |
| Firefly | `#0F3933` | 0.31 | |
| Deep teal | `#3D8879` | 0.58 | |
| HL800 | `#072723` | 0.25 | the dark on the HyperCore / HyperEVM badges |
| Logo dark | `#011916` | 0.20 | the dark the logo itself is drawn in |
| Ebony | `#04060C` | 0.12 | |

Bounce contributes the violet axis at hue ~285–300: `#6753F1`, `#9E88F8`,
`#D4BDFF`, and the indigo `#242047`. Both were read out of the live CSS
(`bounce.tech` names the Hyperliquid ones explicitly as `--hl-*`).

Around those, a small spread of warm and cool neighbours so a wallet does not
always land on teal. Backgrounds are held a little under the fur in chroma —
they are a field behind a character, not a subject — but only a little. Held
much further under, which they were, they stop reading as a colour at all.

## The treatment, and why the palette alone was never going to be enough

`src/core/treatment.ts`, specified in §5.1. Warm soft-light down from the top,
cool soft-light up from the bottom, elliptical vignette centred slightly above
the middle.

Everything above this section is about making one cat legible. None of it makes
forty cats look like they belong to each other, and they don't: the selector
draws five colourways from five independent lists, so a grid is by construction a
bag of unrelated hues. That is a different problem from contrast and it needs a
different fix. Miniature painters hit it whenever a squad gets painted across
several sittings, and they solve it with a wash — one translucent pass over
everything finished, which drags every colour a little towards a common one
without hiding any of them.

That is what this is. It was chosen out of a bench of twenty-six candidates
(plain washes, duotones, bleach, bloom, chromatic aberration, and combinations of
those at partial strength); the bench has been deleted now that the choice is
made, and it is in the history if another one is ever needed.

Things worth keeping in mind:

- **Soft-light, not normal.** A warm layer composited normally washes the picture
  towards orange and kills the fur. Soft-light warms what is already there and
  leaves white white — note the base cat's face is untouched at `#ffffff`.
- **The vignette is zero across the face.** Deliberate. It ramps from 38% of the
  ellipse outwards, and the muzzle, eyes and whiskers all sit inside that. So
  every APCA number in the sections above still holds after the treatment, and
  `audit-colors.ts` is right to measure the untreated palette.
- **The vignette lands almost entirely on the background, so it is a palette
  decision wearing a lighting costume.** At its original 0.385 it took the
  corners down by nearly two fifths, and since the deep field is already the
  darkest thing on the canvas, a deep tile arrived near-black whatever hue it had
  been given — the palette was being fixed at one end and undone at the other.
  0.22 reads as the same lighting and costs the backgrounds far less. If the set
  ever looks flat or muddy again, check this before reaching for the hexes.
- **Vector and raster express it twice.** `treatmentSvg()` hands three rects to
  the browser; `treatPixels()` computes it per pixel for the PNG scripts. That
  duplication is deliberate, not an oversight waiting to be tidied: baking the
  gradients into the pixel grid would break every horizontal run and take the
  SVG from 23 KB to well over a hundred, which is the whole inline-data-URI
  story. The two were checked against each other pixel by pixel and agree to
  within 1/255; the constants they share are where drift would actually hurt.
- **Comparing an untagged PNG against an SVG in one page will lie to you.** The
  PNG comes out visibly more saturated because it dodges the display-profile
  conversion the SVG gets. Both were identical numerically. Probe values through
  a canvas rather than trusting a screenshot.

## What the audience already recognises

Researched from the Foundation's own brand kit and sticker set rather than from
secondhand write-ups. The things worth remembering:

- **The Hyperliquid mark is a bow tie at this size, and the fix is where it sits,
 not what shape it is.** The mark is two rounded lobes pinched to a waist about a
 third of their height. `BLOB` in `tools/make-traits.py` is it, eleven by six, worn
 by `cap-logo` and `hoodie-logo`.

 Six rows is all there is, in both places the mark can go: the cap's crown is rows
 8-13, above which it tapers into its own outline and below which the seam starts;
 the chest is rows 40-45, with row 39 taken by the ink line closing the jaw cut-out
 and row 46 the last row of the canvas, where the mark reads as cropped. Six rows
 cannot hold a one-third waist and look like anything but a bow tie. Flattening the
 pinch to escape that was tried across about twenty glyphs at every width from 9 to
 13, and every one collapsed into a plain letter H, which is what the trait used to
 be. There is no third shape in the range — don't go looking for one.

 What actually works is position. Centred on the chest the mark lands under the
 throat, which is exactly where a bow tie goes, and at that size the position
 decides the reading. Out on the chest at column 26 the same pixels read as a badge
 on a garment. The cap needs no such dodge and stays centred, because nothing wears
 a bow tie on its head, so there is no competing reading to fall into.

 Two things this cost, worth not rediscovering. Thirteen wide is a dumbbell: the
 pinch is still one pixel deep but the span it interrupts is longer, so the lobes
 stop being lobes and become weights. And one column further out, at 27, the outer
 lobe crowds the edge of the torso.
- **Hypurr is the ecosystem's cat and he already has a costume**: white fur shaded
  in pale *blue* rather than grey, a near-black hoodie, a mint blob on the chest.
  The `hypurr` fur colourway quotes his palette. His shading is `#88D5F0`, which
  scores Lc 28 against white — the only detail in the palette below the floor —
  so ours is one step deeper at `#7AC6E4`.
- **The Foundation's 41-sticker set is a pre-approved trait list.** Anything it
  puts on this cat is on-brand by definition: cowboy hat, kabuto, deerstalker,
  mortarboard, beanie, nightcap, ski goggles, round spectacles. Still unbuilt from
  that list: kabuto, deerstalker (needs simplifying — a 2px check is noise at this
  size), ski goggles, ice block, fire halo.
- **"Alright buddy" is the community's defining gesture** and has no fixed image,
  so the `buddy` mouth defines rather than copies it: a level line with one corner
  a single row up. Fond, not sneering — that distinction is the whole trait.

Things to stay away from, and why:

- **The JELLY incident is not a joke to them.** No jellyfish, no JELLY reference.
- **No real people.** Not Jeff Yan, who is private and has had security problems;
  not James Wynn, who has live allegations against him.
- **No third-party marks.** Super Saiyan hair, the Iron Throne, console silhouettes.
- **TinyHyperCats is already a pixel-art cat collection on Hyperliquid.** Avoid
  their hats specifically: sombrero, Santa, Nyan rainbow.
- **Bias clean over grimy.** The Hypurr art direction explicitly rejected Web3's
  "dark palette and neon fatigue", and this audience's self-image is competent
  rather than degen.

## Drawing a trait

Three helpers in `tools/make-traits.py` do most of the work, and skipping any of
them shows immediately:

- **`inked()`** rings a shape in its own outline, eroding inward so it keeps its
  authored size. Everything the cat wears needs this. Without it a hat is a flat
  colour field on a character drawn with a one-pixel ink line everywhere else, and
  it reads as a sticker rather than clothing. It leaves interior pixels alone, so
  an explicitly placed `o` survives and can be used as a seam — which is how the
  cap's peak is told apart from its shell.
- **`hat()`** inks the shape and *then* cuts the ears back out, so they sit in
  front. This is what the reference does, and the ear triangles are most of what
  makes the silhouette read as a cat at 24px. `crown=` limits the cut to a row
  range, for hats whose brim or cuff passes in front of the ear bases even though
  the crown behind it does not.

  **The order is the entire trick, and getting it backwards is invisible in the
  code and obvious on the screen.** Ink after the cut and the hat's own outline
  runs down the cut edge, so the crown ends in a hard vertical black line exactly
  where it meets the ear. Nothing in the world stops behind something else like
  that, and both the cap and the beanie read for weeks as flat shapes parked
  behind the head rather than hats being worn. Ink first, cut second, and the
  crown's edge is simply not drawn where the ear covers it — which is what
  occlusion is.
- **`garment()`** cuts the jaw out and clips everything to the torso.
- **`merge()`** unions rows. Spreading two dicts that share a row silently drops
  one of them, which is how the mortarboard lost its whole crown to its tassel.

Two rules of thumb learned the hard way:

- **Nothing thinner than three rows survives `inked()`.** At two, every pixel is an
  edge and the shape comes out as a bare wire. The headphone band had to be
  thickened for this reason.
- **Judge everything at 48px, not at 8x.** Nearly every trait that has had to be
  rebuilt looked fine in the preview. `trait-shots.ts` puts a native-size copy
  beside each blow-up for exactly this reason, and `sheet.ts` renders a wall of
  whole identicons, which is the only way to see whether forty of them read as one
  family and still tell each other apart.
- **A trait can be faultless and still be wrong with another one, and no
  single-trait view will ever show you.** The trait sheets each draw one trait over
  a neutral face, which is right for asking whether a trait is drawn well and
  useless for asking what the set actually contains. An expression is a property of
  the whole face: the eyepatch is good, the sleepy lids are good, and together the
  cat has no eye open at all and reads as unconscious. Put a smirk under that and
  it reads as a stroke, which is roughly how it was reported. `faces.ts` lays out
  every mouth against every pair of eyes, optionally through an accessory, and it
  is the only view that catches this class of thing.

  The fix is `excludes` in `art-source/manifest.json`, spec §3.1 — see the
  Combinations section below before adding one.
- **A dark line on the face needs a light row under it.** Shut and narrowed eyes
  were the only traits that could leave a face completely blank: on a near-black
  cat a one-pixel dark lid is nothing at all. Every closed lid now carries a glint
  or crease row, so whichever way the fur goes, one of the two rows contrasts.
  Same reasoning applies to an open mouth, whose interior has to be *warm* light
  on a deep cat — a light neutral one stops reading as a cavity and starts
  reading as a block of teeth.
- **Do not ink anything two pixels thick.** Every pixel is an edge, so the whole
  shape comes out the ink colour. That is fine on fur and fatal on the halo, which
  is the one worn thing sitting entirely on the background — the slot it needs is
  `a`, which flips with tone. It also cost the mortarboard its tassel: a two-pixel
  cord came out solid ink right beside the far ear's own ink line. Anything that
  dangles needs a terminal mass wide enough to keep an interior.
- **Read a hat's outline as if it were solid black.** That is all you get at 48px.
  By that logic one thick horizontal band is a striped jumper whatever colour it
  is — the jersey needed trim above and below the band before it read as sport.
- **The cowboy hat is told by its crown, not its brim.** A wide brim whose ends
  nudge up two rows is a sombrero, so the tips were curled four rows clear of the
  brim line — which is right for a cowboy hat and wrong for this head. The rows
  the tips rise through are exactly the rows the ears occupy, so the silhouette
  came out as a bar with two blocks floating either side of it: a headband with
  antennae, the worst read anything in this set has had. The brim is now one
  unbroken sweep below the ears, lifting a single row at each end where it is
  still attached to itself, and the hat is carried by a tall crown with a crease
  pinched down the top of it, which is the real signature anyway.
- **Hats are distinguished by silhouette, not by detail.** Beanie, bucket and cap
  were three versions of one shallow dome plus a horizontal bar, and no amount of
  adjusting the bar fixed it — the difference has to be in the *crown*, because at
  48px the crown is most of what there is. The bucket is a flat-topped truncated
  cone, which is what a bucket hat actually is; the beanie goes wide almost at once
  and then runs straight down, so its top is a curve; the cap is a shell with a
  peak swept off one side.

  A beanie in particular has to be **low**. Twelve rows of crown widening the whole
  way is a cone, and a cone above a cuff is a bowler — it read as a small hard hat
  perched on the cat rather than knitwear pulled onto it. A beanie has no crown to
  speak of; it is the shape of the head underneath.
- **A background cannot be a single figure, and it cannot be intricate either.**
  The cat owns the middle of the canvas; what is left is two margins about eight
  columns wide and a band across the top. The Hyperliquid mark failed here twice
  over: drawn full size its waist — the entire shape — sat at exactly head height,
  so all that showed was a bump either side of the ears, and shrunk to a corner
  watermark it survived being drawn but not being seen. Backgrounds hold their two
  tones deliberately close together, and at that separation a shape with a
  three-column gap in the middle is a smudge at 48px where a dot grid is not.
  Anything here has to be edge-anchored and simple, which is why the order book
  ladder works: bars of varying length running in from both margins.
- **Only clip the crown of a hat, never its brim.** The ears occupy rows 6-16,
  columns 8-17 and 31-38. A brim run through `hat()` comes back with a bite out of
  each side and its tips detached, floating in the background — which happened to
  both the cowboy hat and the bucket hat. Merge the brim in unclipped afterwards,
  or clear the ears entirely, as the mortarboard's board does so its crown can drop
  into the gap between the ears.

  Clearing the ears has its own trap, though: hold the board *too* high and too
  wide and the board and the ears together frame the crown, so what reads is the
  frame — a squared arch with a hat lost inside it. Bring it down until the gap
  closes and widen the crown until the mass is back underneath the board.
- **A strap, a temple or a cord has to leave the head on both sides.** There is no
  object with one end. The eyepatch's strap used to run off the patch as a single
  diagonal and stop in mid-air by the far eye, which reads as a crack rather than
  a band; the spectacles' near temple stopped halfway across the cheek and the
  frame looked unattached. Both now reach the outline and the head is understood
  to join them behind.
- **Two identical things must stay identical.** Foreshortening the far lens of a
  pair of spectacles is correct perspective and wrong art: the eye knows a pair of
  glasses is two matching rings, so a smaller far one does not read as a turned
  head, it reads as a defect. The rule the three-quarter view earns elsewhere —
  near ear big, far ear small — does not extend to manufactured objects.
- **Spectacles have no lens.** Filling `g` is right for shades and visors and
  fatal here: on a deep colourway `g` and `o` are both near-black, so the specs
  came out as two solid squares and the cat looked redacted rather than
  bespectacled. Leaving the rims empty costs nothing — eyes are painted before
  accessories, so whichever eyes the wallet drew show through the glass, which is
  the whole charm of the trait. Clear lenses are also just what spectacles *are*;
  shades already own the you-cannot-see-through-them read.
- **Headphone cups cannot go over a cat's ears.** The tips sit at columns 9 and
  37, the outer edge of the skull, which is exactly the line the band's arm has to
  come down. Cups big enough to enclose the ears delete them and with them the
  silhouette; cups small enough to spare them sit on top pointing at the floor.
  The way out is to stop insisting on over-ear: the cups drop to cheek height
  where a hoop would actually rest, the band is clipped like any other hat so it
  passes behind the ears, and the cat keeps its ears.
- **The torso is only rows 32-46, and the chin covers the middle of the first six.**
  Collars go at 36-38, where there is width either side of the jaw; anything centred
  goes at 40 or lower. Detail below 46 is cropped, which is how the chest logo once
  ended up as a bar along the bottom edge.
- **A garment has to tell its whole story inside rows 39-47, or it is not a garment
  this sprite can wear.** That is nine rows, and it killed three of them. The suit
  went through three rebuilds — shirt V and tie, then lapels, then lapels with an
  ink notch — and never survived, because tailoring is nothing *but* collar, shirt
  and tie and there is no room for all three. Overalls died the same way: braces
  cross the shoulders, the shoulders are rows 36-40, and the chin eats almost all
  of that, so the straps were clipped away and what shipped was a bib floating on a
  plain shirt. The ones that work are silhouette-scale — a big logo, horizontal
  quilting broken by a placket, a V-neck three pixels thick and five rows deep, a
  scarf whose wrap and tail both fit in the band. **If a garment idea needs the
  shoulders or needs three stacked details, drop it rather than shrink it.**
- **A garment's trim slot is not far enough from its fabric to carry a shape.**
  It is sized to edge a collar, not to be read as an object across the chest: the
  scarf drawn in trim vanished and left only its own ink outline, which read as a
  bracket drawn on the cat. Anything that has to be seen as a separate garment
  layer takes the bright slot.
- **Hang a tail from the middle of the thing it hangs off.** The scarf's tail
  dropped from the wrap's outer edge and the two together made one continuous
  L-bracket. Inset it and the same two shapes read as a scarf.

## Combinations

Traits are drawn from independent lists, which is what makes the space big and is
also the only reason two of them can fight. An art entry can name pairs it may not
be drawn with:

```json
{ "id": "eyepatch", "name": "Eyepatch", "weight": 4,
  "excludes": [{ "layer": "eyes", "art": "sleepy" }] }
```

`selectTraits` filters a layer's candidates to those compatible with everything
already drawn, then picks from what is left. Things worth knowing:

- **The check is symmetric and the draw count is fixed.** Declare a pair on
  whichever of the two it reads best on; `SELECT_ORDER` does not matter. Each layer
  consumes exactly one draw whether or not anything was filtered, so an exclusion
  changes what that layer lands on and nothing about the layers after it.
- **The excluded weight is shared out, not re-rolled.** Barring the eyepatch from a
  sleepy cat makes the other four accessories proportionally likelier on that cat,
  which is why it does not distort the overall distribution much: the eyepatch is
  weight 4 of 80 and sleepy is 14 of 68.
- **Every rule needs a reason that is about the pair.** If a trait looks wrong next
  to most things, it is the trait that is wrong and an exclusion is a way of not
  fixing it. The bar is two traits that are each right and are wrong together.
- **Reach for this last.** It is the only thing in the system that makes one trait
  depend on another, and a manifest full of rules is a manifest whose art needs
  redrawing. There is currently one.

Two failures cost real time and are worth recognising early:

- **A face needs one open eye, or something deliberately covering both.** Shades
  and the visor hide both eyes and read fine, because concealment is plainly the
  point. One eye covered and the other closed reads as unconscious instead — the
  face looks like it is trying to show an eye and failing.
- **Two asymmetries on one face fight.** A crooked mouth under a crooked eye reads
  as palsy rather than as a smirk and a wink. This is why the Wink was dropped
  rather than fixed; it would be viable again now that pairs can be excluded, but
  it would need barring from both the Buddy mouth and the eyepatch.

## Known gaps
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
- **Nothing checks trait pairs either.** `excludes` enforces the rules someone has
  already noticed; there is no equivalent of `audit-colors.ts` that would find the
  next bad pair on its own, and it is not obvious what one would measure. Laying
  the grid out with `faces.ts` and looking at it is the whole method.
