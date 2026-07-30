"""Author the trait grids from span tables.

Each trait is described as {row: [(col_start, col_end, slot), ...]} in canvas
coordinates, which is far less error-prone than typing exact-width ASCII rows
by hand. The generated art-source/*.txt files are the committed artifact that
build-art.ts consumes.

The body is symmetric about column 23, so `mir` and `pair` do the reflecting
and a trait only has to be described once, for one side. Anchors come from
tools/anchors.json, written by make-body.py, so the two cannot drift apart:
run make-body.py first.
"""

import json
import os

N = 48
OUT = "packages/hyper-identicons/art-source"
AXIS = 23  # the skull's centre column; mir() reflects through it
MUZZLE = 4  # columns the three-quarter view pushes the muzzle right of the skull
EYEWEAR = 3  # lenses span the whole face, so they follow it less far than the eyes do

with open("tools/anchors.json") as fh:
    ANCHORS = json.load(fh)
HEAD = {int(k): tuple(v) for k, v in ANCHORS["head"].items()}
CHEST = {int(k): tuple(v) for k, v in ANCHORS["chest"].items()}
EARS = [
    {int(k): tuple(v) for k, v in ANCHORS["ear_near"].items()},
    {int(k): tuple(v) for k, v in ANCHORS["ear_far"].items()},
]
DROP = ANCHORS["drop"]  # rows the whole cat sits below where it was traced


def mir(x):
    return 2 * AXIS - x


def pair(x0, x1, ch):
    """A run plus its mirror image, as a list of runs."""
    return [(x0, x1, ch), (mir(x1), mir(x0), ch)]


def twin(x0, x1, ch, span):
    """A run inside `span`, repeated at the same offset inside span's mirror.

    A copy rather than a reflection, which is the difference between one light
    source and two. Mirroring a highlight pushes it to the outer edge of each
    eye or lens, and the cat comes out cross-eyed; the reference draws both
    highlights on the same side.
    """
    dx = mir(span[1]) - span[0]
    return [(x0, x1, ch), (x0 + dx, x1 + dx, ch)]


def mid(half, ch):
    """A run of width 2*half+1 sitting on the centre column."""
    return (AXIS - half, AXIS + half, ch)


def flatten(runs):
    out = []
    for r in runs:
        out.extend(r) if isinstance(r, list) else out.append(r)
    return out


def emit(path, spans, header, shift=0):
    """spans: {row: [(x0, x1, char), ...]} in canvas coordinates.

    `shift` slides a trait sideways after it has been mirrored. The skull is
    centred on AXIS but the cat is a three-quarter view, so anything that sits
    on the muzzle -- eyes, nose, mouth, lenses -- has to move with it.

    DROP is applied here too, so callers can stay in the coordinates the cat was
    traced in. A row pushed off the bottom by it is cropped rather than an error:
    the torso already reaches the canvas edge, so that is what dropping means.
    """
    cells = {}
    for y, runs in spans.items():
        y += DROP
        if y >= N:
            continue
        for x0, x1, ch in flatten(runs):
            x0, x1 = x0 + shift, x1 + shift
            for x in range(x0, x1 + 1):
                if not (0 <= x < N and 0 <= y < N):
                    raise SystemExit(f"{path}: ({x},{y}) outside the {N}x{N} canvas")
                if ch != ".":
                    cells[(y, x)] = ch
    if not cells:
        raise SystemExit(f"{path}: empty")
    top = min(y for y, _ in cells)
    bottom = max(y for y, _ in cells)
    left = min(x for _, x in cells)
    right = max(x for _, x in cells)
    rows = [
        "".join(cells.get((y, x), ".") for x in range(left, right + 1))
        for y in range(top, bottom + 1)
    ]
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as fh:
        fh.write(header.rstrip() + "\n")
        fh.write(f"@ {top} {left}\n")
        fh.write("\n".join(rows) + "\n")
    print(f"  {path:32s} {right - left + 1:2d}x{bottom - top + 1:2d} at {left},{top}")


def garment(extra=None, fill="a"):
    """The chest, with the jaw cut out so the chin stays in front of the collar.

    Trims, collars and logos are clipped to the torso as well. Drawing a band as
    a symmetric pair when the torso is not symmetric leaves a column hanging off
    one edge, and a stray pixel out in the background is far worse than a band
    that stops a column short of the seam.
    """
    spans = {y: [(x0, x1, fill)] for y, (x0, x1) in sorted(CHEST.items())}
    for y, runs in (extra or {}).items():
        spans.setdefault(y, []).extend(flatten(runs))

    clipped = {}
    for y, runs in spans.items():
        torso, chin = CHEST.get(y), HEAD.get(y)
        if not torso:
            continue
        keep = []
        for x0, x1, ch in runs:
            x0, x1 = max(x0, torso[0]), min(x1, torso[1])
            if x0 > x1:
                continue
            if not chin:
                keep.append((x0, x1, ch))
                continue
            if x0 <= min(x1, chin[0] - 1):
                keep.append((x0, min(x1, chin[0] - 1), ch))
            if max(x0, chin[1] + 1) <= x1:
                keep.append((max(x0, chin[1] + 1), x1, ch))
        if keep:
            clipped[y] = keep
    return inked(clipped, floor=N - 1 - DROP)


def subtract(runs, holes):
    """The parts of `runs` not covered by the (x0, x1) pairs in `holes`."""
    out = []
    for x0, x1, ch in runs:
        pieces = [(x0, x1)]
        for h0, h1 in holes:
            nxt = []
            for a, b in pieces:
                if b < h0 or a > h1:
                    nxt.append((a, b))
                    continue
                if a < h0:
                    nxt.append((a, h0 - 1))
                if b > h1:
                    nxt.append((h1 + 1, b))
            pieces = nxt
        out.extend((a, b, ch) for a, b in pieces)
    return out


def merge(*parts):
    """Row-wise union. Spreading dicts silently drops a row that appears twice."""
    out = {}
    for part in parts:
        for y, runs in part.items():
            out.setdefault(y, []).extend(flatten(runs))
    return out


def hat(spans, ears=True, crown=None):
    """Ink a hat, then cut the ears back out of it so they sit in front.

    The reference wears its cap between the ears rather than over them, and it is
    the right call for more than fidelity: the ear triangles are most of what makes
    the silhouette read as a cat at 24px, and a hat that swallows them turns the
    character into a blob in a hat. `ears=False` is for the few things that really
    do go over them, like headphone cups.

    **The order is the whole trick.** Inking after the cut runs the hat's own
    outline down the cut edge, so the crown ends in a hard vertical black line
    exactly where it meets the ear -- which is what an object stopping behind
    another object does not look like, and is why both the cap and the beanie read
    as flat shapes parked behind the head. Inking first and cutting second leaves
    the crown's edge unmarked and hidden under the ear, which is what occlusion
    actually looks like.

    `crown` limits the cut to a row range. A brim passes in *front* of the ear
    bases even when the crown behind it does not, and clipping it takes a bite out
    of each side and strands the tips in the background.
    """
    out = inked(spans)
    if not ears:
        return out
    return {
        y: kept
        for y, runs in out.items()
        if (kept := subtract(
            flatten(runs),
            [] if (crown is not None and y not in crown) else [e[y] for e in EARS if y in e],
        ))
    }


def inked(spans, slot="o", floor=None):
    """Ring a shape in its own outline, the way the body is.

    Without this a hat is a flat colour field pasted onto a cat that is drawn with
    a one-pixel ink line everywhere else, and it reads as a sticker sitting on top
    of the picture rather than a thing the cat is wearing. Erodes inward, so the
    shape keeps the size it was authored at, and leaves interior detail alone --
    which means an explicitly placed 'o' stays put and can be used as a seam.

    `floor` is the last row the canvas shows: past it there is no edge to draw,
    only the bottom of the picture, and inking that puts a black bar under a
    torso that is meant to run off the frame.
    """
    cells = {}
    for y, runs in spans.items():
        for x0, x1, ch in flatten(runs):
            for x in range(x0, x1 + 1):
                cells[(y, x)] = ch
    out = {}
    for (y, x), ch in sorted(cells.items()):
        edge = any(
            (y + dy, x + dx) not in cells and not (floor is not None and y + dy > floor)
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
        )
        out.setdefault(y, []).append((x, x, slot if edge else ch))
    return out


# The Hyperliquid mark: two rounded lobes pinched to a waist, box-filtered off the
# official path. Both places it goes -- the cap's crown and the chest -- have
# exactly six usable rows, and that is what fixes the size.
#
# Eleven wide, not thirteen. At thirteen the waist is the same one pixel of pinch
# across a longer span and the thing reads as a dumbbell.
#
# The shape is a bow tie, and there is no version of it at this size that is not:
# the mark's waist is about a third of its lobe height, and six rows cannot hold
# that ratio and look like anything else. Flattening the pinch to escape it was
# tried across about twenty glyphs and every one collapsed into a plain letter H,
# which is what this used to be. So the pinch stays and the placement does the
# work instead -- see the hoodie.
BLOB = (
    ".##.....##.",
    "####..#####",
    "###########",
    "###########",
    "####..#####",
    ".##.....##.",
)


def glyph(rows, top, left, ch="h"):
    """Place an ASCII glyph as span runs, one run per unbroken stretch of '#'.

    A logo is the one thing here worth authoring as a picture rather than as a
    span table: the whole question about it is what shape it is.
    """
    out = {}
    for dy, row in enumerate(rows):
        runs, x = [], 0
        while x < len(row):
            if row[x] != "#":
                x += 1
                continue
            x1 = x
            while x1 + 1 < len(row) and row[x1 + 1] == "#":
                x1 += 1
            runs.append((left + x, left + x1, ch))
            x = x1 + 1
        if runs:
            out[top + dy] = runs
    return out


def sockets(pattern, top, left):
    """Draw one eye socket and copy it across the face, so both eyes match."""
    span = (left, left + max(x1 for runs in pattern for _, x1, _ in runs))
    return {
        top + dy: flatten([twin(left + x0, left + x1, ch, span) for x0, x1, ch in runs])
        for dy, runs in enumerate(pattern)
    }


# Eyes occupy rows 20-25 in two 5-wide sockets at cols 14-18 and 28-32, which
# leaves them fully behind every lens accessory.
print("eyes:")
emit("eyes/round.txt", sockets([
    [(1, 3, "k")],
    [(0, 0, "k"), (1, 1, "e"), (2, 3, "i"), (4, 4, "k")],
    [(0, 0, "k"), (1, 3, "i"), (4, 4, "k")],
    [(1, 3, "k")],
], top=21, left=14), "# Round eyes. Slots: k rim, e glint, i iris.", shift=MUZZLE)

# A shut or narrowed eye is a dark line, and a dark line on a dark cat is nothing
# at all -- these two were the only traits that could leave a face completely
# blank at 48px. Every one of them now carries a glint row: the squint keeps the
# round eye's highlight in its slit, and the shut lids get a lit crease
# underneath. Whichever way the fur goes, one of the two rows contrasts with it.
emit("eyes/squint.txt", sockets([
    [(0, 4, "k")],
    [(0, 0, "k"), (1, 1, "e"), (2, 3, "i"), (4, 4, "k")],
], top=22, left=14), "# A narrowed slit. Slots: k rim, e glint, i iris.", shift=MUZZLE)

emit("eyes/sleepy.txt", sockets([
    [(0, 0, "k"), (4, 4, "k")],
    [(1, 3, "k")],
    [(1, 3, "e")],
], top=22, left=14), "# Contentedly shut. Slots: k lid, e crease.", shift=MUZZLE)

# Nose at rows 26-27, a philtrum down to 29, mouth from 30. The reference hangs
# the muzzle this low: the jaw runs to row 39, and a mouth any higher than this
# leaves a dead expanse of chin under it.
print("mouths:")
NOSE = {26: [mid(1, "o")], 27: [mid(1, "o")], 28: [mid(0, "o")], 29: [mid(0, "o")]}


def mouth(path, extra, header):
    spans = {k: list(v) for k, v in NOSE.items()}
    for y, runs in extra.items():
        spans.setdefault(y, []).extend(flatten(runs))
    emit(path, spans, header, shift=MUZZLE)


mouth("mouth/neutral.txt", {30: [mid(1, "o")], 31: [pair(21, 21, "o")]},
      "# Nose and a level mouth, as on the reference.")
mouth("mouth/smile.txt", {30: [pair(20, 20, "o"), mid(0, "o")], 31: [pair(21, 22, "o")]},
      "# The classic cat curve.")
# The community's own gesture: a level mouth with one corner a single row up.
# Fond rather than sneering, which is the whole point of it, and the entire trait
# is that one pixel of asymmetry.
mouth("mouth/buddy.txt", {30: [(24, 26, "o")], 31: [(20, 24, "o")]},
      "# Unimpressed but friendly.")

mouth("mouth/blep.txt", {
    30: [pair(20, 20, "o"), mid(0, "o")],
    31: [pair(21, 22, "o")],
    32: [(21, 21, "o"), (22, 24, "p"), (25, 25, "o")],
    33: [(21, 21, "o"), (22, 24, "p"), (25, 25, "o")],
    34: [(22, 24, "o")],
}, "# Tongue out. Slots: o line, p tongue.")

# Seven wide and four deep, starting a clear row below the philtrum. At five by
# three and touching the nose it read as a second nostril rather than a mouth.
mouth("mouth/open.txt", {
    31: [mid(3, "o")],
    32: [pair(20, 20, "o"), mid(2, "k")],
    33: [pair(20, 20, "o"), mid(2, "k")],
    34: [mid(2, "o")],
}, "# Open mouth. Slots: o line, k interior.")

# Lens accessories all cover rows 20-25 so they hide whichever eyes are drawn.
print("accessories:")
# Two columns narrower each side than the reference draws them. At full width the
# lenses ran past the cheeks into the background and the cat looked like it was
# wearing someone else's glasses; the brow bar still reaches the head's edge, which
# is the part that carries the shape.
LENS = (26, 38)
emit("accessory/shades-thug.txt", {
    20: [pair(9, 39, "o")],
    21: [pair(26, 38, "g"), twin(33, 34, "w", LENS)],
    22: [pair(26, 38, "g"), twin(32, 33, "w", LENS)],
    23: [pair(27, 38, "g")],
    24: [pair(29, 37, "g")],
    25: [pair(31, 35, "g")],
}, "# The reference sunglasses. Slots: o brow bar, g lens, w shine.", shift=EYEWEAR)

# Empty rims. Every other lens accessory here fills 'g', and on a deep colourway
# 'g' and 'o' are both near-black, so filled spectacles came out as two solid
# squares -- the cat looked like it had been redacted rather than bespectacled.
# Clear glass is also just what spectacles are; shades are the ones you cannot
# see through, and they already own that read.
#
# Leaving the lens open costs nothing because the eyes layer is painted first, so
# whichever eyes were drawn show through the rims, which is the entire charm of
# the trait and the thing a filled lens was throwing away.
#
# Both lenses are the same 7x6. Foreshortening the far one was the right instinct
# and the wrong trait: a pair of spectacles is two identical rings and the eye
# knows it, so a smaller far lens does not read as perspective, it reads as a
# manufacturing fault. The near temple runs all the way out to the head's edge --
# stopped short it left the frame hanging in the middle of the cheek.
emit("accessory/specs.txt", {
    19: [(15, 19, "o"), (29, 33, "o")],
    20: [(14, 14, "o"), (20, 20, "o"), (28, 28, "o"), (34, 34, "o")],
    21: [(14, 14, "o"), (20, 20, "o"), (21, 27, "o"), (28, 28, "o"), (34, 34, "o")],
    22: [(5, 13, "o"), (14, 14, "o"), (20, 20, "o"),
         (28, 28, "o"), (34, 34, "o"), (35, 36, "o")],
    23: [(14, 14, "o"), (20, 20, "o"), (28, 28, "o"), (34, 34, "o")],
    24: [(15, 19, "o"), (29, 33, "o")],
}, "# Round spectacles, clear lenses. Slots: o frame.", shift=EYEWEAR)

# Two rows of scan line, not one. The lit slit is the entire difference between a
# visor and a blindfold, and at 48px a single row of it is gone.
emit("accessory/visor.txt", {
    20: [pair(8, 38, "o")],
    21: [pair(8, 8, "o"), pair(9, 37, "g")],
    22: [pair(8, 8, "o"), pair(9, 37, "g"), pair(11, 35, "h")],
    23: [pair(9, 9, "o"), pair(10, 36, "g"), pair(12, 34, "h")],
    24: [pair(10, 36, "o")],
}, "# Wraparound visor with a lit scan line. Slots: o frame, g lens, h scan.", shift=EYEWEAR)

# The strap has to leave the head on both sides. The previous one ran off the
# patch as a single diagonal and stopped in mid-air beside the far eye, which
# reads as a crack in the lens rather than a band round the skull -- there is no
# object a strap can be if it has one end. So it now exits left at eye level and
# climbs right across the brow to the far edge, and the head is understood to
# join the two behind.
#
# It covers the near eye, not the far one. The near side is the one the muzzle is
# shifted towards and the one with the room, and covering the smaller far eye
# barely changes the face.
emit("accessory/eyepatch.txt", {
    16: [(34, 35, "c")],
    17: [(31, 35, "c")],
    18: [(14, 19, "o"), (28, 33, "c")],
    19: [(13, 13, "o"), (14, 19, "g"), (20, 20, "o"), (25, 30, "c")],
    20: [(6, 11, "c"), (12, 12, "o"), (13, 20, "g"), (21, 21, "o"), (22, 27, "c")],
    21: [(6, 11, "c"), (12, 12, "o"), (13, 20, "g"), (21, 21, "o"), (22, 24, "c")],
    22: [(12, 12, "o"), (13, 20, "g"), (21, 21, "o")],
    23: [(13, 13, "o"), (14, 19, "g"), (20, 20, "o")],
    24: [(14, 19, "o")],
}, "# Eyepatch, strap running right round the head. Slots: o rim, g patch, c strap.",
     shift=EYEWEAR)

print("headwear:")
# The reference cap: a tall rounded shell sitting between the ears, with the peak
# swept out over the far side of the face. The ears are cut back out of it by
# hat(), which is what the reference does and what keeps the cat a cat.
# Row 15 is placed as 'o' rather than left to inked(): the shell and the peak are
# one connected shape, so the only thing telling them apart is that seam. It is
# what the reference does, and it is why the cap can be a single flat colour and
# still read as a cap rather than a dome with a shelf attached.
#
# Shell and peak are inked as one shape and only the shell rows are cut against
# the ears, so the peak stays a single unbroken sweep and the shell's sides vanish
# under the ear rather than stopping at a black line beside it.
#
# The mark is bottom-anchored at row 13. Rows 8 to 13 are the only ones where the
# crown is both wide enough and clear of the ear cut, so the glyph's height is what
# it is because the crown has six usable rows, not because six reads best.
#
# Centred, unlike the one on the hoodie. The hoodie's has to move off centre to
# stop reading as a bow tie, but nothing wears a bow tie on its head, so the cap
# has no competing reading to dodge and a crown badge belongs in the middle.
emit("headwear/cap-logo.txt", hat(merge({
    5: [(19, 28, "a")],
    6: [(17, 30, "a")],
    7: [(16, 32, "a")],
    8: [(15, 33, "a")],
    9: [(14, 34, "a")],
    10: [(14, 34, "a"), (15, 15, "c")],
    11: [(13, 35, "a"), (14, 14, "c")],
    12: [(13, 35, "a"), (14, 14, "c")],
    13: [(13, 35, "a")],
    14: [(13, 36, "a")],
    15: [(13, 40, "o")],
    16: [(13, 41, "a")],
    17: [(14, 41, "a")],
    18: [(18, 40, "a")],
}, glyph(BLOB, 8, 18)), crown=range(0, 15)),
     "# The reference cap. Slots: a shell, c seam, h mark, o ink.")

# No beanie. It was a dome over a cuff, which is the bucket hat with the brim
# swapped for a band, and the two never stopped competing: every fix that made the
# beanie read better made it look more like the bucket, and the last one -- lowering
# the crown so it hugged the skull -- landed it right back on the bucket's outline.
# One dome-shaped hat is enough.

# A flat-topped truncated cone, which is what a bucket hat actually is. It goes flat
# on top and widens all the way down into a short brim, so it is not the cap's shell
# with a peak swept off one side and it is not the cowboy's creased crown either.
emit("headwear/bucket.txt", hat({
    6: [(19, 28, "a")],
    7: [(18, 29, "a")],
    8: [(18, 29, "a")],
    9: [(17, 30, "a")],
    10: [(17, 30, "a")],
    11: [(16, 31, "a")],
    12: [(15, 32, "a")],
    13: [(15, 32, "a")],
    14: [(14, 33, "a")],
    15: [(10, 38, "b")],
    16: [(7, 41, "b")],
    17: [(6, 42, "b")],
}, crown=range(0, 15)), "# Bucket hat. Slots: a crown, b brim.")

# An ellipse seen almost edge on, and every part of that matters. Ten wide by four
# it was a rectangle with a slot in it; the ring only reads as a ring once the
# corners step in, and it only reads as a ring in perspective once it is more than
# three times wider than it is tall.
#
# Not run through inked(). Everything else worn sits on fur, but this sits entirely
# on the background, where the ink slot is the one colour guaranteed not to show:
# a two-pixel ring is all edge, so inking turned the whole halo the ink colour and
# it disappeared against the field behind it. Drawn in 'a', which flips with tone.
#
# Sitting four rows lower than it was. Pinned to the top of the canvas it had no
# relationship to the cat at all -- a halo belongs to the head it is over, and at
# that distance it read as an unrelated mark in the sky. Its lowest row is level
# with the ear tips, which is as close as it can come without the ears appearing
# to pierce it.
emit("headwear/halo.txt", {
    4: [(19, 27, "a")],
    5: [(17, 18, "a"), (28, 29, "a")],
    6: [(15, 16, "a"), (30, 31, "a")],
    7: [(17, 18, "a"), (28, 29, "a")],
    8: [(19, 27, "a")],
}, "# Floating halo. Slots: a ring.")

# The Foundation's own sticker set puts a cowboy hat, a mortarboard and a nightcap
# on this cat, so all three are on-brand by definition rather than by guesswork.
#
# Only the crown is cut against the ears. A brim is the whole point of a wide hat
# and it has to be one unbroken sweep: clipped, it lost a bite out of each side and
# the tips came away as two dark stubs floating in the background.
# The curled tips had to go. Curling them four rows clear of the brim line does
# make a cowboy hat rather than a sombrero -- on a head with no ears. On this one
# the ears occupy exactly the rows the tips rise through, so the silhouette came
# out as a bar with two blocks floating either side of it: a headband with
# antennae, which is the worst read anything in this set has had.
#
# So the hat is told by its crown instead. A cowboy hat's real signature is a tall
# crown with a crease pinched down the top of it, and rows 5-6 draw that as two
# humps with a notch between. The brim stays one unbroken sweep below the ears,
# lifting a single row at each end where it is still attached to itself.
emit("headwear/cowboy.txt", hat(merge(
    {
        5: [(18, 21, "a"), (26, 29, "a")],
        6: [(17, 30, "a")],
        7: [(16, 31, "a")],
        8: [(16, 31, "a")],
        9: [(15, 32, "a")],
        10: [(15, 32, "a")],
        11: [(15, 32, "a")],
        12: [(14, 33, "a")],
        13: [(14, 33, "a")],
    },
    {
        14: [(4, 9, "b"), (14, 33, "a"), (38, 43, "b")],
        15: [(3, 44, "b")],
        16: [(3, 44, "b")],
        17: [(6, 41, "b")],
        18: [(11, 36, "b")],
    },
), crown=range(0, 14)), "# Meowdy. Slots: a creased crown, b brim.")

# No mortarboard. A wide flat board over a crown needs the board to clear the ear
# tips outright, because a board with two bites out of it is not a board -- and once
# it clears them, the board and the ears together frame the crown and the frame is
# what reads: a squared arch with a hat lost inside it. Dropping it low enough to
# close that gap puts it back on the ears. There is no height that works.

# Drooping to the near side, which is where the asymmetry earns its keep: almost
# everything else worn here is bilateral, and the cat is not.
#
# It used to droop the other way. Reflecting it through AXIS is most of the job but
# not all of it, and the two columns it is offset by are both load-bearing:
#
# The cuff is one right of where the reflection puts it. It spans an even number of
# columns, so it cannot straddle AXIS -- the old one sat a column right of centre
# and the mirror inherited that as a column left, which on a skull that *is*
# symmetric reads as the band having slipped.
#
# The pom is one right again, clear of the cuff's shift. Reflected exactly, its
# lower-left corner lands on column 9 in the row directly above the near ear's tip,
# and two outlined shapes touching corner to corner at this size are one shape: the
# ear stopped being an ear and became part of the hat. It now clears the tip by a
# column as well as a row.
#
# Lifting the pom instead is the obvious fix and it is wrong, for the same reason
# giving it a fourth row to make it rounder is wrong: the pom's job is to be the far
# end of a diagonal, and anything that reads as a ball in its own right stands up
# into a knob on the crown, which is a bobble hat. It has to stay welded to the
# cone's shoulder and get its clearance sideways. The fourth row also pushed the
# cone down into the near ear, and four rows came back cut where two do now.
#
# Nor can the tip actually hang. A real nightcap flops over and the pom dangles,
# and there is a route for it: nothing is above row 6, so the cone can arc over
# the ear and come down outside it around column 4. Built, it droops convincingly
# at 8x and falls apart at 48 -- the limb carrying the pom has columns 2-7 to live
# in, because 8-11 is ear and gets cut, so it is two or three columns wide with one
# of those the ink line. At native size the limb disappears behind the ear and the
# pom is a tab floating in the background. Thickening it only enlarges the tab.
#
# So the tip points up rather than hanging, on both this and every version before
# it. That is a real limitation of a 48px canvas with tall ears, not an oversight.
emit("headwear/nightcap.txt", hat({
    3: [(12, 16, "c")],
    4: [(11, 17, "c")],
    5: [(11, 17, "c")],
    6: [(11, 19, "a")],
    7: [(14, 22, "a")],
    8: [(15, 25, "a")],
    9: [(16, 28, "a")],
    10: [(16, 30, "a")],
    11: [(16, 32, "a")],
    12: [(15, 34, "a")],
    13: [(14, 35, "a")],
    14: [(11, 35, "b")],
    15: [(10, 36, "b")],
    16: [(10, 36, "b")],
    17: [(10, 36, "b")],
}, crown=range(0, 14)), "# Nightcap with a pom. Slots: a cone, b cuff, c pom.")

# No headphones. The last version read well -- band arcing over and clipped behind
# the ears, cups dropped to cheek height where a hoop would rest on a round skull --
# but reading well cost it the whole outline of the head. The band plus two cups is
# the widest thing in the set by some margin and it wraps the cat from row 3 to row
# 26, so on a small render the silhouette stopped being a cat in headphones and
# became a rounded blob with a face in it.
#
# Worth remembering if it ever comes back: cups cannot go over a cat's ears. The
# tips sit at columns 9 and 37, the outside edge of the skull, which is exactly the
# line the band's arm has to come down. On top of the ears they read as two speakers
# pointing at the floor; big enough to enclose the ears they delete them.

print("clothing:")
# Only rows 32-46 of the torso ever reach the canvas, and the chin eats the middle
# of the first six of those. So a collar goes at 36-38, where there is width either
# side of the jaw, and anything centred goes at 40 or below, where the chin has
# finished. Detail authored past row 46 is simply cropped, which is how the chest
# logo used to end up as a bar across the bottom edge.
COLLAR = {36: [(0, 47, "b")], 37: [(0, 47, "b")], 38: [(0, 47, "b")]}
CENTRE = 24  # the torso's middle, which is not the skull's


def chest(half, ch, y0, y1):
    return {y: [(CENTRE - half, CENTRE + half, ch)] for y in range(y0, y1 + 1)}


# A V-neck rather than a crew, because a crew neck on this cat is nothing at all:
# the neckline lands where the chin is, garment() cuts the chin out, and what is
# left is a flat colour field.
#
# Three pixels of band and five rows deep. The first version was two pixels and
# four rows, which is legible at 8x and gone at 48px -- and a tee that is not
# telling you it is a tee is the bare chest this set just deleted. Everything
# starts at row 39, the first row clear of the jaw.
emit("clothing/tee.txt", garment({
    **COLLAR,
    39: [(18, 20, "b"), (28, 30, "b")],
    40: [(19, 21, "b"), (27, 29, "b")],
    41: [(20, 22, "b"), (26, 28, "b")],
    42: [(21, 23, "b"), (25, 27, "b")],
    43: [(22, 26, "b")],
}), "# V-neck tee. Slots: a fabric, b neckline.")

# Row 39 is not free even though the collar stops at 38: the jaw is cut out of the
# torso above it, so 39 carries the ink line closing that hole. That leaves rows 40
# to 45, and it is why the mark is six rows rather than seven -- a seventh row lands
# on the last row of the canvas and the mark reads as cropped.
#
# Off centre, and that is the whole reason the mark is wearable here. Centred it
# lands under the throat, which is where a bow tie goes, and the shape is close
# enough to one that the position decides the reading. Out on the chest the same
# pixels read as a badge on a garment. It goes to the viewer's right: that is the
# near side of a three-quarter view, and the wearer's left, which is the side a
# chest logo sits on. Column 26 rather than 27 -- a column further out and the
# outer lobe crowds the edge of the torso.
emit("clothing/hoodie-logo.txt", garment(merge(COLLAR, glyph(BLOB, 40, 26))),
     "# The reference hoodie. Slots: a body, b collar, h mark.")

# A scarf, to replace some of what the suit and the jersey took with them when they
# went. Overalls were the first attempt and failed the way the suit did: braces have
# to cross the shoulders, the shoulders are rows 36 to 40, and the chin occupies
# almost all of that, so the straps were clipped away and what shipped was a bib
# floating on a plain shirt.
#
# The lesson is that the only usable chest is rows 39 to 47, and a garment has to
# put its whole story inside that band. A scarf does: a wrap across the neck, an ink
# line closing it off, and a tail dropping out of that line down the near side.
#
# The wrap stops well short of the shoulder seams. Run edge to edge it was just a
# horizontal stripe across the torso and the cat was wearing a rugby shirt -- the
# thing that makes it a scarf is seeing the garment underneath continue past it on
# both sides. The fringe takes the bright slot so the tail terminates in something
# rather than running off the bottom of the canvas.
#
# The wool is the bright slot rather than the trim slot. Trim sits close enough to
# the base fabric on a bright colourway that the scarf disappeared and left only
# its own ink outline behind, which read as a bracket drawn on the cat's chest.
# The bright slot is the only one guaranteed to part company with both.
emit("clothing/scarf.txt", garment({
    **{y: [(11, 11, "o"), (12, 36, "c"), (37, 37, "o")] for y in range(39, 43)},
    43: [(11, 16, "o"), (17, 22, "c"), (23, 37, "o")],
    **{y: [(16, 16, "o"), (17, 22, "c"), (23, 23, "o")] for y in range(44, 47)},
    47: [(16, 16, "o"), (17, 22, "b"), (23, 23, "o")],
}), "# Scarf. Slots: a top, c wool, b fringe, o edges.")

emit("clothing/hoodie.txt", garment({
    **COLLAR,
    40: [(21, 22, "c"), (26, 27, "c")],
    41: [(21, 22, "c"), (26, 27, "c")],
    42: [(21, 22, "c"), (26, 27, "c")],
    43: [(21, 22, "c"), (26, 27, "c")],
    44: [(21, 21, "c"), (27, 27, "c")],
}), "# Hoodie with drawstrings. Slots: a fabric, b collar, c cords.")

# Quilting is a recess, so the seams are ink. Drawn in the trim slot they came out
# as three bright stripes and the coat read as a rugby shirt.
#
# Horizontal seams alone are still a rugby shirt, though: a jumper has them too.
# What makes it a coat is the zip placket running down the middle, breaking every
# band in the same place and turning three stripes into six quilted panels.
#
# Four columns of placket, not six. At six it stopped being a zip and became a
# panel down the front, and the coat read as body armour. The short vertical ticks
# between the horizontal seams are what turn two long stripes into chambers.
emit("clothing/puffer.txt", garment(merge(
    COLLAR,
    {41: [(0, 47, "o")], 44: [(0, 47, "o")], 47: [(0, 47, "o")]},
    {y: [(14, 14, "o"), (33, 33, "o")] for y in (42, 43, 45, 46)},
    {y: [(22, 22, "o"), (23, 24, "b"), (25, 25, "o")] for y in range(39, 48)},
)), "# Quilted puffer. Slots: a fabric, b collar and placket, o seams.")

# What was missing was the lapels. A shirt V and a tie floating on a flat colour
# field is a jumper with a bib on it; the thing that reads as tailoring is the two
# diagonal bands running down from the shoulders to a point. They converge one row
# per row while the shirt inside them narrows at the same rate, which is what keeps
# the V straight instead of stepped.
#
# Everything starts at row 39, the first row the jaw has cleared. Above that
# garment() cuts the chin out of the middle and a lapel comes back as a chip
# stranded on the shoulder.
#
# The tie is drawn in the ink slot rather than the logo slot. A tie is black on
# every suit there has ever been, and 'h' is the brand mint on a deep colourway,
# which put a glowing wedge down the cat's chest.
# No suit. It went through three rebuilds -- shirt V and tie, then lapels, then
# lapels with an ink notch -- and never survived the trip down to 48px, where the
# shirt is one white fleck and the tie is a dark spike that reads as a zip. The
# chin eats the middle of the torso down to row 38, which leaves eight rows for a
# collar, a shirt and a tie, and tailoring is the one garment that is nothing but
# collar, shirt and tie. It is below the detail budget of this sprite. The puffer
# and the hoodies work here because their whole structure is silhouette-scale.
