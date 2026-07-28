"""Trace the reference JPEG into a slot-character grid at the target canvas size.

The reference has a white background and white fur, distinguishable only by the
black outline, so background is found by flood-filling light pixels inward from
the border. Everything light the fill cannot reach is fur.

Framing is driven by the ink bounding box: the artwork is scaled so it spans
`--content` cells horizontally, with `--top` cells of headroom above the ear
tips. The body runs off the bottom edge, matching the reference's bust crop.
"""

import argparse
from collections import deque

import numpy as np
from PIL import Image


def classify(arr):
    r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
    lum = arr.mean(axis=2)
    accent = (g - r > 35) & (g > 130) & (b - r > 10)
    ink = (lum < 120) & ~accent
    return ink, accent


def flood_background(is_light):
    h, w = is_light.shape
    bg = np.zeros_like(is_light)
    queue = deque()
    for x in range(w):
        for y in (0, h - 1):
            if is_light[y, x] and not bg[y, x]:
                bg[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_light[y, x] and not bg[y, x]:
                bg[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and is_light[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                queue.append((ny, nx))
    return bg


parser = argparse.ArgumentParser()
parser.add_argument("path")
parser.add_argument("--size", type=int, default=48)
parser.add_argument("--content", type=float, default=44.0, help="cells the artwork spans")
parser.add_argument("--fit", choices=("width", "height"), default="width")
parser.add_argument("--top", type=float, default=2.0, help="cells of headroom above ear tips")
parser.add_argument("--supersample", type=int, default=8)
parser.add_argument("--tag", default="")
args = parser.parse_args()

N, SS = args.size, args.supersample
src = Image.open(args.path).convert("RGB")

# Locate the artwork in the source so framing is measured, not guessed.
full = np.asarray(src).astype(np.int16)
ink_full, accent_full = classify(full)
mark = ink_full | accent_full
ys, xs = np.nonzero(mark)
x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
print(f"source {src.width}x{src.height}, artwork x {x0}..{x1}, y {y0}..{y1}")

span = (x1 - x0 + 1) if args.fit == "width" else (y1 - y0 + 1)
cell = span / args.content
crop_x = x0 - (N - (x1 - x0 + 1) / cell) / 2 * cell
crop_y = y0 - args.top * cell
crop_side = N * cell
print(f"cell {cell:.2f}px, crop origin ({crop_x:.0f},{crop_y:.0f}) side {crop_side:.0f}px")

canvas = Image.new("RGB", (int(round(crop_side)), int(round(crop_side))), (255, 255, 255))
canvas.paste(src, (int(round(-crop_x)), int(round(-crop_y))))
work = canvas.resize((N * SS, N * SS), Image.Resampling.LANCZOS)

arr = np.asarray(work).astype(np.int16)
is_ink, is_accent = classify(arr)
bg = flood_background(~is_ink & ~is_accent)
cls = np.where(bg, 0, np.where(is_ink, 1, np.where(is_accent, 2, 3)))

cells = cls.reshape(N, SS, N, SS).transpose(0, 2, 1, 3).reshape(N, N, SS * SS)
counts = np.stack([(cells == k).sum(axis=2) for k in range(4)], axis=2)
counts[:, :, 2] = (counts[:, :, 2] * 2.2).astype(int)
grid = counts.argmax(axis=2)

CHAR = {0: ".", 1: "o", 2: "h", 3: "f"}
lines = ["".join(CHAR[v] for v in row) for row in grid]

print("#    " + "".join(str(i // 10) for i in range(N)))
print("#    " + "".join(str(i % 10) for i in range(N)))
for i, line in enumerate(lines):
    print(f"{i:3d}  {line}")

tag = args.tag or str(N)
with open(f"tools/out/traced-{tag}.txt", "w") as fh:
    fh.write("\n".join(lines) + "\n")

palette = {".": (255, 255, 255), "o": (17, 17, 17), "h": (94, 234, 212), "f": (245, 245, 245)}
preview = Image.new("RGB", (N, N))
preview.putdata([palette[c] for line in lines for c in line])
preview.resize((N * 12, N * 12), Image.Resampling.NEAREST).save(f"tools/out/traced-{tag}.png")
print(f"\nwrote tools/out/traced-{tag}.txt and .png")
