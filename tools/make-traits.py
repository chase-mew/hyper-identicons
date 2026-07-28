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
emit("headwear/cap-h.txt", hat({
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
    15: [(13, 40, "o")],
    16: [(13, 41, "a")],
    17: [(14, 41, "a")],
    18: [(18, 40, "a")],
}, crown=range(0, 15)), "# The reference cap. Slots: a shell, c seam, h logo, o ink.")

# No bobble. Every version with one read as a lidded pot: a small ball needs its
# own ink ring to be a ball at all, and that ring plus the crown's meet in a dark
# neck that the eye takes for a handle. The pom lives on its own trait instead,
# where it can sit clear of the crown.
# Beanie, bucket and cap were three versions of the same shallow dome plus a
# horizontal bar, and at 48px they were not telling each other apart. The beanie
# is the one that hugs the skull: it goes wide almost immediately and then runs
# straight down, so the top is a curve. The bucket is the straight-sided cone with
# the flat top and the cap is a shell with a peak swept off one side.
#
# Low and wide, not tall and narrow. Twelve rows of crown starting at row 2 and
# widening the whole way is a cone, which is both the bucket's shape and, perched
# above a cuff, a bowler -- it read as a small hard hat sitting on the cat rather
# than knitwear pulled onto it. A beanie has no crown to speak of; it is the shape
# of the head underneath.
#
# Only the crown is cut. The cuff is knit and pulled down over the ear bases, so
# it passes in front of them and the tips come out through the crown above it,
# which is what a beanie on a cat looks like and also gives the ears somewhere to
# be other than sliced off at the hairline.
emit("headwear/beanie.txt", hat({
    5: [(18, 30, "a")],
    6: [(16, 32, "a")],
    7: [(15, 33, "a")],
    8: [(14, 34, "a")],
    9: [(13, 35, "a")],
    10: [(13, 35, "a")],
    11: [(13, 35, "a")],
    12: [(13, 35, "a")],
    13: [(13, 35, "a")],
    # The cuff overhangs the crown by two columns a side and is five rows deep, so
    # inked() leaves three of colour rather than one. Flush with the crown and two
    # rows deep it was a hatband, and a dome plus a hatband is a bowler.
    14: [(11, 37, "b")],
    15: [(11, 37, "b")],
    16: [(11, 37, "b")],
    17: [(11, 37, "b")],
    18: [(11, 37, "b")],
}, crown=range(0, 14)), "# Knit beanie, ears through the cuff. Slots: a crown, b cuff.")

# A flat-topped truncated cone, which is what a bucket hat actually is and what
# finally tells it apart from the beanie. Both were rounded domes over a
# horizontal band, and no amount of adjusting the band fixed that -- the
# difference has to be in the crown, because at 48px the crown is most of what
# there is. The beanie keeps the dome; this one goes flat on top and widens all
# the way down into a short brim.
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

# The board is flat and wide and does all the work. It has to clear the ear tips
# outright rather than be clipped around them -- a board with two bites out of it
# is not a board -- so it rides above row 6 and the crown drops into the gap
# between the ears, where it needs almost no clipping at all. The tassel hangs
# past column 38, the furthest the far ear reaches.
emit("headwear/mortarboard.txt", hat(merge(
    # Four rows of board, not three. inked() takes the outer ring, so three rows
    # leaves a single row of colour and the board comes out as a drawn line rather
    # than a slab. It also reaches column 41 so the cord hangs off the board's own
    # corner: at 39 the two were diagonal neighbours, inked() treated them as
    # separate shapes, and the tassel floated free beside the hat.
    #
    # Riding one row lower and pulled in at the ends. High and very wide, board
    # and ears together made a squared arch with the crown lost inside it -- the
    # frame read as the object. Closing the gap and widening the crown puts the
    # mass back under the board, which is the whole shape of a mortarboard.
    {y: [(11, 41, "a")] for y in range(4, 8)},
    {y: [(15, 32, "a")] for y in range(8, 16)},
    # The cord alone is invisible: two pixels wide, so every one of them is an
    # edge and inked() paints the lot the ink colour, right beside the far ear's
    # own ink line. It needs a terminal mass wide enough to keep an interior, and
    # it has to hang clear of column 38, which is as far as the ear reaches.
    {y: [(40, 42, "c")] for y in range(8, 13)},
    {y: [(39, 43, "c")] for y in range(13, 17)},
), crown=range(8, 16)), "# Purrfessor. Slots: a board and crown, c tassel.")

# Drooping to the far side, which is where the asymmetry earns its keep: almost
# everything else worn here is bilateral, and the cat is not.
emit("headwear/nightcap.txt", hat({
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
}, crown=range(0, 14)), "# Nightcap with a pom. Slots: a cone, b cuff, c pom.")

# A hoop that goes round the head, with the ears left in front of it.
#
# Two earlier versions put the cups up at ear height. The first sat them on top of
# the ears with the arms diving in from outside, which read as two speakers
# clamped on pointing at the floor; the second made them big enough to enclose the
# ears, which is what real over-ear cups do and which deleted the ears, and with
# them most of what makes the silhouette a cat. There is no third position up
# there: the tips sit at columns 9 and 37, the outside edge of the skull, which is
# exactly the line an arm has to come down.
#
# So the cups drop to the sides of the head at cheek height, where a hoop would
# actually rest on a round skull, and the band is clipped against the ears like
# any other hat so it passes behind them. Anatomically it is on-ear rather than
# over-ear. It reads instantly, which the correct version did not.
emit("headwear/headphones.txt", hat({
    3: [(18, 29, "a")],
    4: [(15, 32, "a")],
    5: [(12, 17, "a"), (30, 35, "a")],
    6: [(10, 15, "a"), (32, 37, "a")],
    7: [(8, 13, "a"), (34, 39, "a")],
    8: [(6, 12, "a"), (35, 41, "a")],
    9: [(5, 11, "a"), (36, 42, "a")],
    **{y: [(4, 10, "a"), (37, 43, "a")] for y in range(10, 17)},
    # The far cup starts at 37, not 36. At 36 it took a column off the far eye's
    # rim, and a cup overlapping an eye is a blindfold.
    17: [(3, 11, "a"), (37, 45, "a")],
    **{y: [(3, 11, "a"), (5, 9, "c"), (37, 45, "a"), (39, 43, "c")] for y in range(18, 25)},
    25: [(3, 11, "a"), (37, 45, "a")],
    26: [(4, 10, "a"), (38, 44, "a")],
}, crown=range(0, 17)), "# Headphones. Slots: a band and cups, c pads.")

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

# No blob hoodie. The real Hyperliquid mark is two rounded lobes joined at a waist,
# and I drew it faithfully -- box-filtered off the official path at 13x9, correct
# waist depth, correct four-column clearance between the lobes. It is a bow tie. It
# is a bow tie centred on the chest and it is still a bow tie moved onto the near
# shoulder, because at this size any pinched horizontal shape with two round ends
# is a bow tie, and accuracy does not outvote that. Redrawing it as an H just made
# a second copy of the hoodie above, so the blob variant is gone and the reference
# artist's H -- which the cap also wears -- is the one Hyperliquid mark in the set.

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
