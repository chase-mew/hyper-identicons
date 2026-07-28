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


def hat(spans, ears=True):
    """A hat, with the ears cut back out of it if they should sit in front.

    The reference wears its cap between the ears rather than over them, and it is
    the right call for more than fidelity: the ear triangles are most of what makes
    the silhouette read as a cat at 24px, and a hat that swallows them turns the
    character into a blob in a hat. `ears=False` is for the few things that really
    do go over them, like headphone cups.
    """
    if not ears:
        return spans
    return {
        y: kept
        for y, runs in spans.items()
        if (kept := subtract(flatten(runs), [e[y] for e in EARS if y in e]))
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
# at all -- these three were the only traits that could leave a face completely
# blank at 48px. Every one of them now carries a glint row: the squint keeps the
# round eye's highlight in its slit, and the two shut lids get a lit crease
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

# The shut eye is built exactly as the sleepy pair is, corner ticks and all. As a
# plain dash it read as a filled wedge rather than a closed lid.
emit("eyes/wink.txt", {
    21: [(28, 30, "k")],
    22: [(14, 14, "k"), (18, 18, "k"), (27, 27, "k"), (28, 28, "e"), (29, 30, "i"), (31, 31, "k")],
    23: [(15, 17, "k"), (27, 27, "k"), (28, 30, "i"), (31, 31, "k")],
    24: [(15, 17, "e"), (28, 30, "k")],
}, "# One eye shut. Slots: k rim, e glint, i iris.", shift=MUZZLE)

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
LENS = (25, 39)
emit("accessory/shades-thug.txt", {
    20: [pair(7, 39, "o")],
    21: [pair(25, 39, "g"), twin(33, 34, "w", LENS)],
    22: [pair(25, 39, "g"), twin(32, 33, "w", LENS)],
    23: [pair(26, 39, "g")],
    24: [pair(28, 38, "g")],
    25: [pair(30, 36, "g")],
}, "# The reference sunglasses. Slots: o brow bar, g lens, w shine.", shift=EYEWEAR)

# Not mirrored, because nothing else on this face is. The near lens is a row
# taller and a column wider than the far one, which is what a pair of circles
# does when the head is turned, and it also buys the near side the mass it needs:
# at six by five with a one-pixel rim these came apart into loose pixels at 48px.
emit("accessory/specs.txt", {
    19: [(14, 18, "o")],
    20: [(13, 13, "o"), (14, 18, "g"), (19, 19, "o"), (29, 32, "o")],
    21: [(12, 12, "o"), (13, 19, "g"), (20, 27, "o"), (28, 28, "o"), (29, 32, "g"), (33, 33, "o")],
    22: [(8, 11, "o"), (12, 12, "o"), (13, 19, "g"), (20, 20, "o"),
         (28, 28, "o"), (29, 32, "g"), (33, 33, "o"), (34, 37, "o")],
    23: [(13, 13, "o"), (14, 18, "g"), (19, 19, "o"), (28, 28, "o"), (29, 32, "g"), (33, 33, "o")],
    24: [(14, 18, "o"), (29, 32, "o")],
}, "# Round spectacles. Slots: o frame, g lens.", shift=EYEWEAR)

# Two rows of scan line, not one. The lit slit is the entire difference between a
# visor and a blindfold, and at 48px a single row of it is gone.
emit("accessory/visor.txt", {
    20: [pair(8, 38, "o")],
    21: [pair(8, 8, "o"), pair(9, 37, "g")],
    22: [pair(8, 8, "o"), pair(9, 37, "g"), pair(11, 35, "h")],
    23: [pair(9, 9, "o"), pair(10, 36, "g"), pair(12, 34, "h")],
    24: [pair(10, 36, "o")],
}, "# Wraparound visor with a lit scan line. Slots: o frame, g lens, h scan.", shift=EYEWEAR)

# The patch has to be the biggest thing here. A two-row strap running the whole
# width of the brow outweighed it and the trait read as a headband with a stray
# square under it, so the strap is now a single diagonal climbing away over the
# skull and it stops at the crown rather than crossing the far eye.
#
# It covers the near eye, not the far one. The near side is the one the muzzle is
# shifted towards and the one with the room, and covering the smaller far eye
# barely changes the face.
emit("accessory/eyepatch.txt", {
    18: [(14, 19, "o")],
    19: [(13, 20, "o"), (21, 23, "c")],
    20: [(13, 13, "o"), (14, 19, "g"), (20, 20, "o"), (23, 25, "c")],
    21: [(12, 12, "o"), (13, 20, "g"), (21, 21, "o"), (25, 27, "c")],
    22: [(12, 12, "o"), (13, 20, "g"), (21, 21, "o"), (27, 29, "c")],
    23: [(13, 13, "o"), (14, 19, "g"), (20, 20, "o")],
    24: [(14, 19, "o")],
}, "# Eyepatch, strap swept back over the skull. Slots: o rim, g patch, c strap.",
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
# The shell is clipped against the ears and the peak is not, for the same reason
# the cowboy hat's brim is not: the peak runs out past the far ear, so clipping it
# took a bite out of the middle and left the tip stranded a pixel clear of the hat.
emit("headwear/cap-h.txt", inked(merge(
    hat({
        5: [(19, 28, "a")],
        6: [(17, 30, "a")],
        7: [(16, 32, "a")],
        8: [(15, 33, "a")],
        9: [(14, 34, "a"), (21, 22, "h"), (26, 27, "h")],
        10: [(14, 34, "a"), (15, 15, "c"), (21, 22, "h"), (26, 27, "h")],
        11: [(13, 35, "a"), (14, 14, "c"), (21, 27, "h")],
        12: [(13, 35, "a"), (14, 14, "c"), (21, 22, "h"), (26, 27, "h")],
        13: [(13, 35, "a"), (21, 22, "h"), (26, 27, "h")],
        14: [(13, 36, "a")],
    }),
    {
        15: [(13, 40, "o")],
        16: [(13, 41, "a")],
        17: [(14, 41, "a")],
        18: [(18, 40, "a")],
    },
)), "# The reference cap. Slots: a shell, c seam, h logo, o ink.")

# No bobble. Every version with one read as a lidded pot: a small ball needs its
# own ink ring to be a ball at all, and that ring plus the crown's meet in a dark
# neck that the eye takes for a handle. The pom lives on its own trait instead,
# where it can sit clear of the crown.
# Beanie, bucket and cap were three versions of the same shallow dome plus a
# horizontal bar, and at 48px they were not telling each other apart. The beanie
# takes the tall narrow crown: it starts two rows above the ear tips and slims
# rather than widens, so its silhouette is a dome where the bucket's is a mushroom
# and the cap's is a shell with a peak swept off one side.
emit("headwear/beanie.txt", inked(hat({
    4: [(21, 27, "a")],
    5: [(19, 29, "a")],
    6: [(18, 30, "a")],
    7: [(17, 31, "a")],
    8: [(16, 32, "a")],
    9: [(16, 32, "a")],
    10: [(15, 33, "a")],
    11: [(15, 33, "a")],
    12: [(14, 34, "a")],
    13: [(14, 34, "a")],
    14: [(12, 35, "b")],
    15: [(12, 35, "b")],
    16: [(12, 35, "b")],
    17: [(12, 35, "b")],
})), "# Knit beanie, ears through the cuff. Slots: a crown, b cuff.")

emit("headwear/bucket.txt", inked({
    **hat({
        6: [(19, 28, "a")],
        7: [(17, 30, "a")],
        8: [(16, 31, "a")],
        9: [(15, 32, "a")],
        10: [(14, 33, "a")],
        11: [(14, 34, "a")],
        12: [(13, 34, "a")],
        13: [(13, 35, "a")],
        14: [(13, 35, "a")],
    }),
    # Widening all the way down rather than bulging in the middle. A brim that is
    # widest at its centre row is a flat disc, which is the cowboy hat's shape; the
    # bucket's whole silhouette is the downward flare.
    15: [(9, 39, "b")],
    16: [(7, 41, "b")],
    17: [(5, 43, "b")],
}), "# Bucket hat. Slots: a crown, b brim.")

# An ellipse seen almost edge on, and every part of that matters. Ten wide by four
# it was a rectangle with a slot in it; the ring only reads as a ring once the
# corners step in, and it only reads as a ring in perspective once it is more than
# three times wider than it is tall.
#
# Not run through inked(). Everything else worn sits on fur, but this sits entirely
# on the background, where the ink slot is the one colour guaranteed not to show:
# a two-pixel ring is all edge, so inking turned the whole halo the ink colour and
# it disappeared against the field behind it. Drawn in 'a', which flips with tone.
emit("headwear/halo.txt", {
    0: [(19, 27, "a")],
    1: [(17, 18, "a"), (28, 29, "a")],
    2: [(15, 16, "a"), (30, 31, "a")],
    3: [(17, 18, "a"), (28, 29, "a")],
    4: [(19, 27, "a")],
}, "# Floating halo. Slots: a ring.")

# The Foundation's own sticker set puts a cowboy hat, a mortarboard and a nightcap
# on this cat, so all three are on-brand by definition rather than by guesswork.
#
# Only the crown is cut against the ears. A brim is the whole point of a wide hat
# and it has to be one unbroken sweep: clipped, it lost a bite out of each side and
# the tips came away as two dark stubs floating in the background.
emit("headwear/cowboy.txt", inked(merge(
    # A tall crown over a flat brim is a bowler. What separates the two at this
    # size is only the ratio -- crown short, brim very wide, tips turned up two
    # rows clear of the brim line.
    hat({
        9: [(18, 29, "a")],
        10: [(17, 30, "a")],
        11: [(16, 31, "a")],
        12: [(16, 31, "a")],
        13: [(15, 32, "a")],
    }),
    {
        # The tips curl four rows clear of the brim line, not two. A wide brim
        # whose ends only nudge upward is a sombrero, which is both the wrong hat
        # and a collection this one should stay well away from.
        11: [(3, 6, "b"), (41, 44, "b")],
        12: [(3, 6, "b"), (41, 44, "b")],
        13: [(3, 7, "b"), (40, 44, "b")],
        14: [(3, 8, "b"), (14, 33, "a"), (39, 44, "b")],
        15: [(3, 44, "b")],
        16: [(6, 41, "b")],
        17: [(11, 36, "b")],
    },
)), "# Meowdy. Slots: a crown, b brim.")

# The board is flat and wide and does all the work. It has to clear the ear tips
# outright rather than be clipped around them -- a board with two bites out of it
# is not a board -- so it rides above row 6 and the crown drops into the gap
# between the ears, where it needs almost no clipping at all. The tassel hangs
# past column 38, the furthest the far ear reaches.
emit("headwear/mortarboard.txt", inked(merge(
    {y: [(9, 39, "a")] for y in range(3, 6)},
    hat({y: [(16, 31, "a")] for y in range(6, 14)} | {6: [(17, 30, "a")]}),
    # The cord alone is invisible: two pixels wide, so every one of them is an
    # edge and inked() paints the lot the ink colour, right beside the far ear's
    # own ink line. It needs a terminal mass wide enough to keep an interior, and
    # it has to hang clear of column 38, which is as far as the ear reaches.
    {y: [(40, 41, "c")] for y in range(6, 11)},
    {y: [(39, 43, "c")] for y in range(11, 14)},
)), "# Purrfessor. Slots: a board and crown, c tassel.")

# Drooping to the far side, which is where the asymmetry earns its keep: almost
# everything else worn here is bilateral, and the cat is not.
emit("headwear/nightcap.txt", inked(hat({
    3: [(32, 36, "c")],
    4: [(31, 37, "c")],
    5: [(31, 37, "c")],
    6: [(28, 36, "a")],
    7: [(25, 33, "a")],
    8: [(22, 32, "a")],
    9: [(19, 31, "a")],
    10: [(17, 31, "a")],
    11: [(15, 31, "a")],
    12: [(13, 32, "a")],
    13: [(12, 33, "a")],
    14: [(12, 36, "b")],
    15: [(11, 37, "b")],
    16: [(11, 37, "b")],
    17: [(11, 37, "b")],
})), "# Nightcap with a pom. Slots: a cone, b cuff, c pom.")

# The one thing that really does go over the ears, so it opts out of the clip.
# Cups sit on the ears rather than the sides of the skull: a cat's ears are where
# its hearing is, and cups tucked under them read as earmuffs instead.
#
# The band is three rows thick throughout. At two it had no interior left once
# inked() had run, and the whole arc came out as a bare wire.
emit("headwear/headphones.txt", inked(hat({
    3: [(19, 28, "a")],
    4: [(17, 30, "a")],
    5: [(15, 31, "a")],
    6: [(14, 18, "a"), (29, 33, "a")],
    7: [(12, 16, "a"), (31, 35, "a")],
    8: [(11, 15, "a"), (32, 36, "a")],
    9: [(8, 16, "b"), (31, 39, "b")],
    10: [(7, 16, "b"), (31, 40, "b")],
    11: [(7, 16, "b"), (9, 14, "c"), (31, 40, "b"), (33, 38, "c")],
    12: [(7, 16, "b"), (9, 14, "c"), (31, 40, "b"), (33, 38, "c")],
    13: [(7, 16, "b"), (9, 14, "c"), (31, 40, "b"), (33, 38, "c")],
    14: [(7, 16, "b"), (31, 40, "b")],
    15: [(8, 15, "b"), (32, 39, "b")],
}, ears=False)), "# Over-ear headphones. Slots: a band, b cups, c pads.")

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


emit("clothing/tee.txt", garment(), "# Plain tee. Slots: a fabric.")

# Taller than it is wide, and only two columns per stem. At eleven wide with a
# centre bar it read as a dumbbell rather than an H.
emit("clothing/hoodie-h.txt", garment({
    **COLLAR,
    40: [(21, 22, "h"), (26, 27, "h")],
    41: [(21, 22, "h"), (26, 27, "h")],
    42: [(21, 27, "h")],
    43: [(21, 27, "h")],
    44: [(21, 22, "h"), (26, 27, "h")],
    45: [(21, 22, "h"), (26, 27, "h")],
}), "# The reference hoodie. Slots: a body, b collar, h logo.")

# Hyperliquid's actual mark, which is not an H: two rounded lobes joined by a thin
# waist, the right one taller, both contours pinching inward through the middle.
# The reference draws an H, but the H is that artist's shorthand -- this is the
# thing the brand kit ships, and it is the one an owner will recognise.
#
# Box-filtered straight off the official path at 13x9, which is the smallest size
# where it still reads. Two things carry it and both were wrong when I drew it by
# eye: the waist is two full-width rows, not a one-pixel bar, and the lobes clear
# each other by four columns above and below. Narrow the waist or close that gap
# and it turns into a bow tie.
# It goes on the left chest, where Hypurr wears it, and that placement is load
# bearing rather than decorative: a pinched horizontal shape centred under the
# throat is a bow tie no matter how accurately it is drawn.
BLOB = {
    39: [(21, 22, "h")],
    40: [(20, 23, "h")],
    41: [(12, 14, "h"), (19, 24, "h")],
    42: [(12, 15, "h"), (19, 24, "h")],
    43: [(12, 24, "h")],
    44: [(12, 24, "h")],
    45: [(12, 15, "h"), (19, 24, "h")],
    46: [(13, 14, "h"), (20, 23, "h")],
    47: [(21, 22, "h")],
}
emit("clothing/hoodie-blob.txt", garment({**COLLAR, **BLOB}),
     "# Hoodie with the Hyperliquid mark. Slots: a body, b collar, h mark.")

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

# The V starts at row 39, the first row the chin has cleared. Above that the jaw
# cuts the collar in half and the shirt comes out as two floating chips.
emit("clothing/suit.txt", garment({
    39: [(20, 22, "w"), (26, 28, "w")],
    40: [(21, 23, "w"), (25, 27, "w")],
    41: [(22, 26, "w")],
    42: [(22, 26, "h")],
    43: [(23, 25, "h")],
    44: [(23, 25, "h")],
    45: [(23, 25, "h")],
    46: [(23, 25, "h")],
}), "# Suit with shirt and tie. Slots: a jacket, w shirt, h tie.")

# One thick band is a striped jumper. What says sport is the band being *trimmed*
# top and bottom in a second colour, and a stripe running down each sleeve.
emit("clothing/jersey.txt", garment({
    39: [(19, 29, "b")],
    40: [(20, 28, "b")],
    41: [(0, 47, "b")],
    42: [(0, 47, "h")],
    43: [(0, 47, "h")],
    44: [(0, 47, "b")],
    45: [(7, 9, "b"), (38, 40, "b")],
    46: [(7, 9, "b"), (38, 40, "b")],
    47: [(7, 9, "b"), (38, 40, "b")],
}), "# Banded jersey. Slots: a fabric, b neck, trim and sleeve stripes, h band.")
