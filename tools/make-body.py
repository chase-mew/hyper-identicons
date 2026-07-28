"""Build the base cat by tracing the reference at 48x48.

The cat is a three-quarter view, and that is the whole character of it: the near
ear is large and fully drawn, the far ear is a small foreshortened sliver, and
the muzzle and chin sit right of centre. Every span below is read off
tools/out/traced-base.txt, which is the reference downsampled to the canvas
grid, except where the cap, sunglasses and hoodie hide the cat. Those parts --
the crown between the ears, the lower half of the far ear, and the shoulders --
are reconstructed, and are marked as such.

Spans are the filled silhouette; the outline is derived as its boundary, so the
black line is always exactly one pixel and always closed.
"""

import json
from collections import deque

N = 48
OUT = "packages/hyper-identicons/art-source/body/base.txt"
ANCHORS = "tools/anchors.json"

# Near ear: outer edge is a straight vertical, inner edge a staircase descending
# one column per row. Read off the reference, then pulled in a column with the
# rest of the near side of the head.
EAR_NEAR = {
    6: (9, 9), 7: (8, 10), 8: (8, 11), 9: (8, 12), 10: (8, 13), 11: (8, 14),
    12: (8, 15), 13: (8, 16), 14: (8, 17), 15: (8, 18), 16: (8, 19),
}

# Far ear: the reference only shows rows 9-14 above the cap. Below that it is
# reconstructed, kept short and narrow so it still reads as the far side. The
# trace tops it off flat at row 9, which is all the reference needs because the
# cap hides everything higher, but on a bare cat that reads as a stump. Rows 7
# and 8 carry the staircase up to a point instead, so the ear gains a tip rather
# than losing the width it already had.
EAR_FAR = {
    7: (37, 37), 8: (36, 38), 9: (35, 38), 10: (34, 38), 11: (33, 38),
    12: (32, 38), 13: (31, 38), 14: (31, 38), 15: (30, 38), 16: (30, 38),
}

# Reconstructed: the cap covers the skull between the ears entirely. This is the
# top of the skull, not a separate shape -- it has to widen fast enough to meet
# both ears within two rows or it reads as a third lump between them.
CROWN = {13: (21, 26), 14: (18, 30), 15: (15, 32), 16: (11, 34)}

# The face. Rows 21-27 sit behind the sunglasses in the reference, so their
# edges are interpolated between the brow at row 20 and the cheek at row 26.
# The near side runs a column tighter than the trace: at full width the reference
# reads as too much cheek on the near side. The chin tip at rows 38-39 is left
# alone so it stays under the muzzle, which puts the whole column of slack into
# the jaw between rows 36 and 38.
HEAD = {
    17: (9, 38), 18: (9, 38), 19: (9, 38), 20: (9, 38),
    21: (8, 39), 22: (8, 39), 23: (8, 39), 24: (8, 40),
    25: (7, 40), 26: (7, 40), 27: (7, 40), 28: (7, 40),
    29: (8, 40), 30: (8, 39), 31: (9, 38), 32: (10, 38),
    33: (12, 37), 34: (14, 36), 35: (16, 34), 36: (19, 33),
    37: (22, 31), 38: (24, 30), 39: (26, 29),
}

# Both inner ears hug the outer edge of their ear, as in the reference.
PINK = [
    (10, 10, 10), (11, 10, 10), (12, 10, 11), (13, 10, 12), (14, 10, 13),
    (15, 10, 12), (16, 10, 11),
    (12, 36, 36), (13, 35, 36), (14, 34, 36), (15, 35, 36), (16, 36, 36),
]

# Each whisker is two segments stepped down towards the muzzle, so it reads as
# a line sweeping up and out. The far-side pair overhangs the jaw by a pixel,
# exactly as in the reference.
WHISKERS = [
    (27, 12, 15), (28, 16, 17),
    (29, 12, 15), (30, 16, 17),
    (27, 40, 41), (28, 36, 39),
    (29, 40, 41), (30, 36, 39),
]

# Reconstructed: the hoodie hides the shoulders completely.
SHOULDER = {
    32: (19, 31), 33: (13, 34), 34: (12, 37), 35: (9, 39), 36: (7, 40),
    37: (6, 41), 38: (5, 41), 39: (5, 42),
    40: (4, 42), 41: (4, 42), 42: (4, 43), 43: (4, 43),
    44: (3, 43), 45: (3, 44), 46: (3, 44), 47: (3, 44),
}


def blank():
    return [[False] * N for _ in range(N)]


def paint(mask, spans):
    runs = spans.items() if isinstance(spans, dict) else ((y, (a, b)) for y, a, b in spans)
    for y, (x0, x1) in runs:
        for x in range(x0, x1 + 1):
            mask[y][x] = True
    return mask


def fill_holes(mask):
    outside = blank()
    q = deque()
    for y in range(N):
        for x in range(N):
            if (y in (0, N - 1) or x in (0, N - 1)) and not mask[y][x] and not outside[y][x]:
                outside[y][x] = True
                q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < N and 0 <= nx < N and not mask[ny][nx] and not outside[ny][nx]:
                outside[ny][nx] = True
                q.append((ny, nx))
    return [[mask[y][x] or not outside[y][x] for x in range(N)] for y in range(N)]


def outline_of(mask):
    edge = blank()
    for y in range(N):
        for x in range(N):
            if not mask[y][x]:
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if ny >= N:  # the canvas bottom is a crop, not a silhouette edge
                    continue
                if not (0 <= ny < N and 0 <= nx < N) or not mask[ny][nx]:
                    edge[y][x] = True
                    break
    return edge


head = blank()
for spans in (EAR_NEAR, EAR_FAR, CROWN, HEAD):
    paint(head, spans)
head = fill_holes(head)
chest = fill_holes(paint(blank(), SHOULDER))
pink = paint(blank(), PINK)

head_edge, chest_edge = outline_of(head), outline_of(chest)

grid = [["." for _ in range(N)] for _ in range(N)]
for y in range(N):
    for x in range(N):
        # Chest first, head over it, so the chin breaks the shoulder line.
        if chest[y][x]:
            grid[y][x] = "o" if chest_edge[y][x] else "f"
        if head[y][x]:
            grid[y][x] = "o" if head_edge[y][x] else ("p" if pink[y][x] else "f")

for y, x0, x1 in WHISKERS:
    for x in range(x0, x1 + 1):
        grid[y][x] = "s"

rows = ["".join(r) for r in grid]
filled = [i for i, r in enumerate(rows) if set(r) != {"."}]
top, bottom = filled[0], filled[-1]
left = min(min(i for i, c in enumerate(rows[y]) if c != ".") for y in filled)
right = max(max(i for i, c in enumerate(rows[y]) if c != ".") for y in filled)

with open(OUT, "w") as fh:
    fh.write(
        "# Base cat, traced from the reference at 48x48 by tools/make-body.py.\n"
        "# Three-quarter view: near ear large, far ear foreshortened, muzzle right\n"
        "# of centre. Crown, lower far ear and shoulders are reconstructed -- the\n"
        "# cap, sunglasses and hoodie hide them in the reference.\n"
        "# Slots: o outline, f fur, s whiskers, p inner ear.\n"
    )
    fh.write(f"@ {top} {left}\n")
    fh.write("\n".join(r[left:right + 1] for r in rows[top:bottom + 1]) + "\n")


def extents(mask):
    out = {}
    for y in range(N):
        xs = [x for x in range(N) if mask[y][x]]
        if xs:
            out[y] = [min(xs), max(xs)]
    return out


# make-traits.py places features against these, so they cannot drift apart.
with open(ANCHORS, "w") as fh:
    json.dump({"head": extents(head), "chest": extents(chest)}, fh, indent=1)

print(f"{OUT}  {right - left + 1}x{bottom - top + 1} at {left},{top}")
for i, r in enumerate(rows):
    print(f"{i:3d}  {r}")
