"""Generate the full-canvas background grids and the empty 'none' traits.

Backgrounds cover all 48x48 cells, so writing them by hand is pure transcription
error. Everything smaller than the canvas is hand-authored instead.
"""

import math
import os

N = 48
OUT = "packages/hyper-identicons/art-source"


def write(path, rows, header):
    full = os.path.join(OUT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w") as fh:
        fh.write(header.rstrip() + "\n")
        fh.write("@ 0 0\n")
        fh.write("\n".join(rows) + "\n")
    print(f"  {path}")


def build(fn):
    return ["".join(fn(x, y) for x in range(N)) for y in range(N)]


print("backgrounds:")

write("background/plain.txt", build(lambda x, y: "a"),
      "# Flat fill. Slots: a primary.")

write("background/horizon.txt", build(lambda x, y: "b" if y >= 30 else "a"),
      "# Ground plane behind the bust. Slots: a sky, b ground.")

# Disc behind the head, sized so the cat's silhouette breaks its edge.
write("background/glow.txt",
      build(lambda x, y: "b" if (x - 23.5) ** 2 + (y - 24) ** 2 <= 18.5 ** 2 else "a"),
      "# Halo disc behind the head. Slots: a field, b disc.")

write("background/frame.txt",
      build(lambda x, y: "b" if x < 3 or x >= N - 3 or y < 3 or y >= N - 3 else "a"),
      "# Inset border. Slots: a field, b border.")

write("background/rays.txt",
      build(lambda x, y: "b" if ((x + y) // 4) % 2 == 0 else "a"),
      "# Diagonal stripes. Slots: a field, b stripe.")

write("background/grid.txt",
      build(lambda x, y: "b" if x % 6 == 3 and y % 6 == 3 else "a"),
      "# Sparse dot grid. Slots: a field, b dot.")

# The Hyperliquid mark as a corner watermark, in the one part of the canvas the
# cat leaves empty.
#
# Drawn full size first, filling the field with the cat sitting on top, which is
# what a background motif is supposed to be. It did not work: the waist is the
# entire shape, the waist is at mid height, and mid height is exactly where the
# head is. All that showed was a bump either side of the ears. The corner is the
# only place it can be read whole, and at 13x9 it fits above the far ear without
# touching it.
#
# It replaced a thin ring, which sat close enough to the head to read as a
# selection outline and fought the halo trait for the same piece of canvas.
MARK = {
    1: [(42, 43)],
    2: [(41, 44)],
    3: [(33, 35), (40, 45)],
    4: [(33, 36), (40, 45)],
    5: [(33, 45)],
    6: [(33, 45)],
    7: [(33, 36), (40, 45)],
    8: [(34, 35), (41, 44)],
    9: [(42, 43)],
}
MARK_CELLS = {(x, y) for y, runs in MARK.items() for x0, x1 in runs for x in range(x0, x1 + 1)}

write("background/blob.txt", build(lambda x, y: "b" if (x, y) in MARK_CELLS else "a"),
      "# The Hyperliquid mark, tucked into the corner. Slots: a field, b mark.")

print("empty traits:")
for path, label in (
    ("clothing/none.txt", "Bare shoulders"),
    ("accessory/none.txt", "No accessory"),
    ("headwear/none.txt", "No headwear"),
):
    full = os.path.join(OUT, path)
    with open(full, "w") as fh:
        fh.write(f"# {label}: intentionally empty.\n@ 0 0\n.\n")
    print(f"  {path}")
