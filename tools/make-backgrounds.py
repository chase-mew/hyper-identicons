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

write("background/arc.txt",
      build(lambda x, y: "b" if abs(math.hypot(x - 23.5, y - 26) - 20) < 1.6 else "a"),
      "# Thin ring. Slots: a field, b ring.")

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
