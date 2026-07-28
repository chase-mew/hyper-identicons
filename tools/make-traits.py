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
    """
    cells = {}
    for y, runs in spans.items():
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
    return clipped


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

emit("eyes/wide.txt", sockets([
    [(1, 5, "k")],
    [(0, 0, "k"), (1, 5, "i"), (6, 6, "k")],
    [(0, 0, "k"), (1, 1, "e"), (2, 5, "i"), (6, 6, "k")],
    [(0, 0, "k"), (1, 5, "i"), (6, 6, "k")],
    [(1, 5, "k")],
], top=20, left=13), "# Wide eyes. Slots: k rim, e glint, i iris.", shift=MUZZLE)

emit("eyes/squint.txt", sockets([
    [(0, 4, "k")],
    [(0, 0, "k"), (1, 3, "i"), (4, 4, "k")],
], top=22, left=14), "# A narrowed slit. Slots: k rim, i iris.", shift=MUZZLE)

emit("eyes/sleepy.txt", sockets([
    [(0, 0, "k"), (4, 4, "k")],
    [(1, 3, "k")],
], top=22, left=14), "# Contentedly shut. Slots: k lid.", shift=MUZZLE)

emit("eyes/hyper.txt", sockets([
    [(1, 3, "k")],
    [(0, 0, "k"), (1, 3, "h"), (4, 4, "k")],
    [(0, 0, "k"), (1, 3, "h"), (4, 4, "k")],
    [(1, 3, "k")],
], top=21, left=14), "# Aquamarine glow. Slots: k rim, h glow.", shift=MUZZLE)

emit("eyes/wink.txt", {
    21: [(28, 30, "k")],
    22: [(14, 18, "k"), (27, 27, "k"), (28, 28, "e"), (29, 30, "i"), (31, 31, "k")],
    23: [(15, 17, "k"), (27, 27, "k"), (28, 30, "i"), (31, 31, "k")],
    24: [(28, 30, "k")],
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
mouth("mouth/frown.txt", {30: [pair(21, 22, "o")], 31: [pair(20, 20, "o"), mid(0, "o")]},
      "# Inverted curve.")
mouth("mouth/smirk.txt", {30: [(23, 26, "o")], 31: [(26, 27, "o")]},
      "# One corner up.")
mouth("mouth/open.txt", {
    30: [mid(2, "o")],
    31: [pair(21, 21, "o"), mid(1, "k")],
    32: [mid(1, "o")],
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

emit("accessory/specs.txt", {
    20: [pair(27, 32, "o")],
    21: [pair(26, 26, "o"), pair(33, 33, "o"), pair(27, 32, "g")],
    22: [pair(26, 26, "o"), pair(33, 33, "o"), pair(27, 32, "g"),
         (20, 26, "o"), pair(11, 12, "o")],
    23: [pair(26, 26, "o"), pair(33, 33, "o"), pair(27, 32, "g")],
    24: [pair(27, 32, "o")],
}, "# Round spectacles. Slots: o frame, g lens.", shift=EYEWEAR)

emit("accessory/visor.txt", {
    20: [pair(8, 38, "o")],
    21: [pair(8, 8, "o"), pair(9, 37, "g")],
    22: [pair(8, 8, "o"), pair(9, 37, "g")],
    23: [pair(9, 9, "o"), pair(10, 36, "g")],
    24: [pair(10, 36, "o")],
}, "# Wraparound visor. Slots: o frame, g lens.", shift=EYEWEAR)

emit("accessory/monocle.txt", {
    20: [(27, 32, "o")],
    21: [(26, 26, "o"), (27, 32, "g"), (33, 33, "o")],
    22: [(26, 26, "o"), (27, 32, "g"), (33, 33, "o")],
    23: [(26, 26, "o"), (27, 32, "g"), (33, 33, "o")],
    24: [(26, 26, "o"), (27, 32, "g"), (33, 33, "o")],
    25: [(27, 32, "o")],
    26: [(29, 29, "c")],
    27: [(29, 29, "c")],
    28: [(30, 30, "c")],
}, "# Single lens on a chain. Slots: o rim, g lens, c chain.", shift=EYEWEAR)

emit("accessory/eyepatch.txt", {
    21: [pair(8, 38, "o")],
    22: [(13, 19, "o")],
    23: [(13, 19, "o")],
    24: [(13, 19, "o")],
    25: [(13, 19, "o")],
    26: [(14, 18, "o")],
}, "# Eyepatch and strap. Slots: o patch.", shift=EYEWEAR)

print("headwear:")
# The reference cap: a dome over the crown with the peak swept to one side.
emit("headwear/cap-h.txt", {
    8: [(18, 28, "a")],
    9: [(15, 31, "a")],
    10: [(13, 33, "a"), (20, 21, "h"), (25, 26, "h")],
    11: [(12, 34, "a"), (20, 21, "h"), (25, 26, "h")],
    12: [(11, 35, "a"), (20, 26, "h")],
    13: [(11, 35, "a"), (20, 26, "h")],
    14: [(10, 36, "a"), (20, 21, "h"), (25, 26, "h")],
    15: [(10, 36, "a"), (20, 21, "h"), (25, 26, "h")],
    16: [(10, 36, "a")],
    17: [(9, 37, "a")],
    18: [(10, 41, "a")],
    19: [(21, 40, "a")],
}, "# The reference cap. Slots: a shell, h logo.")

emit("headwear/beanie.txt", {
    5: [mid(1, "c")],
    6: [mid(2, "c")],
    7: [mid(2, "c")],
    8: [(17, 29, "a")],
    9: [(15, 31, "a")],
    10: [(13, 33, "a")],
    11: [(12, 34, "a")],
    12: [(11, 35, "a")],
    13: [(11, 35, "a")],
    14: [(10, 36, "a")],
    15: [(10, 36, "b")],
    16: [(9, 37, "b")],
    17: [(9, 37, "b")],
    18: [(10, 36, "b")],
}, "# Knit beanie with a bobble. Slots: a crown, b cuff, c bobble.")

emit("headwear/bucket.txt", {
    8: [(16, 30, "a")],
    9: [(14, 32, "a")],
    10: [(13, 33, "a")],
    11: [(12, 34, "a")],
    12: [(12, 34, "a")],
    13: [(11, 35, "a")],
    14: [(11, 35, "a")],
    15: [(10, 36, "a")],
    16: [(7, 39, "b")],
    17: [(6, 40, "b")],
    18: [(8, 38, "b")],
}, "# Bucket hat. Slots: a crown, b brim.")

emit("headwear/crown.txt", {
    9: [pair(13, 13, "a"), pair(18, 18, "a"), mid(0, "a")],
    10: [pair(13, 13, "a"), pair(18, 18, "a"), mid(0, "a")],
    11: [pair(12, 14, "a"), pair(17, 19, "a"), mid(1, "a")],
    12: [pair(12, 14, "a"), pair(17, 19, "a"), mid(1, "a")],
    13: [(11, 35, "a")],
    14: [(11, 35, "a"), pair(15, 15, "h"), mid(0, "h")],
    15: [(11, 35, "a")],
}, "# Five-point crown. Slots: a band, h jewels.")

emit("headwear/halo.txt", {
    2: [mid(4, "h")],
    3: [pair(18, 19, "h")],
    4: [mid(4, "h")],
}, "# Floating halo. Slots: h ring.")

# The band crosses in front of the ears; routing it between them would need a
# gap narrower than the band is thick.
emit("headwear/headphones.txt", {
    8: [mid(4, "a")],
    9: [pair(15, 18, "a")],
    10: [pair(13, 14, "a")],
    11: [pair(12, 12, "a")],
    12: [pair(11, 11, "a")],
    13: [pair(11, 11, "a")],
    14: [pair(8, 14, "b")],
    15: [pair(8, 14, "b")],
    16: [pair(8, 14, "b")],
    17: [pair(8, 14, "b")],
    18: [pair(8, 14, "b")],
    19: [pair(8, 14, "b")],
    20: [pair(9, 14, "b")],
}, "# Over-ear headphones. Slots: a band, b cups.")

print("clothing:")
emit("clothing/tee.txt", garment(), "# Plain tee. Slots: a fabric.")

# The reference hoodie: chest logo, drawstrings, and a collar under the chin.
emit("clothing/hoodie-h.txt", garment({
    41: [pair(6, 12, "b")],
    42: [pair(5, 14, "b")],
    43: [pair(18, 19, "h")],
    44: [pair(18, 19, "h")],
    45: [pair(18, 23, "h")],
    46: [pair(18, 19, "h")],
    47: [pair(18, 19, "h")],
}), "# The reference hoodie. Slots: a body, b collar, h logo.")

emit("clothing/hoodie.txt", garment({
    41: [pair(6, 12, "b")],
    42: [pair(5, 14, "b")],
    43: [pair(20, 21, "c")],
    44: [pair(20, 21, "c")],
    45: [pair(20, 21, "c")],
    46: [pair(20, 21, "c")],
    47: [pair(20, 21, "c")],
}), "# Hoodie with drawstrings. Slots: a fabric, b collar, c cords.")

emit("clothing/puffer.txt", garment({
    40: [pair(7, 39, "b")],
    43: [pair(5, 41, "b")],
    46: [pair(4, 42, "b")],
}), "# Quilted puffer. Slots: a fabric, b seams.")

emit("clothing/suit.txt", garment({
    41: [pair(19, 21, "w")],
    42: [pair(20, 22, "w")],
    43: [mid(3, "w")],
    44: [mid(2, "h")],
    45: [mid(1, "h")],
    46: [mid(1, "h")],
    47: [mid(1, "h")],
}), "# Suit with shirt and tie. Slots: a jacket, w shirt, h tie.")

emit("clothing/jersey.txt", garment({
    43: [pair(4, 42, "b")],
    44: [pair(4, 42, "h")],
    45: [pair(4, 42, "b")],
}), "# Banded jersey. Slots: a fabric, b trim, h band.")
