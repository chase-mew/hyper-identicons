"""Crop a region of the reference in traced-grid cell coordinates and zoom it."""

import argparse

from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("path")
parser.add_argument("--cells", nargs=4, type=int, metavar=("X0", "Y0", "X1", "Y1"), required=True)
parser.add_argument("--size", type=int, default=48)
parser.add_argument("--content", type=float, default=46.0)
parser.add_argument("--top", type=float, default=1.0)
parser.add_argument("--out", default="tools/out/crop.png")
parser.add_argument("--zoom", type=int, default=16)
args = parser.parse_args()

import numpy as np

src = Image.open(args.path).convert("RGB")
arr = np.asarray(src).astype(np.int16)
r, g, b = arr[:, :, 0].astype(int), arr[:, :, 1].astype(int), arr[:, :, 2].astype(int)
lum = arr.mean(axis=2)
accent = (g - r > 35) & (g > 130) & (b - r > 10)
ink = (lum < 120) & ~accent
ys, xs = np.nonzero(ink | accent)
x0s, y0s = xs.min(), ys.min()
x1s, y1s = xs.max(), ys.max()

cell = (y1s - y0s + 1) / args.content
crop_x = x0s - (args.size - (x1s - x0s + 1) / cell) / 2 * cell
crop_y = y0s - args.top * cell

cx0, cy0, cx1, cy1 = args.cells
box = (
    int(round(crop_x + cx0 * cell)),
    int(round(crop_y + cy0 * cell)),
    int(round(crop_x + (cx1 + 1) * cell)),
    int(round(crop_y + (cy1 + 1) * cell)),
)
region = src.crop(box)
w = (cx1 - cx0 + 1) * args.zoom
h = (cy1 - cy0 + 1) * args.zoom
region = region.resize((w * 4, h * 4), Image.Resampling.LANCZOS)

# Overlay the cell grid so pixel boundaries are unambiguous.
from PIL import ImageDraw

draw = ImageDraw.Draw(region)
for i in range(cx1 - cx0 + 2):
    x = i * region.width / (cx1 - cx0 + 1)
    draw.line([(x, 0), (x, region.height)], fill=(255, 0, 0), width=1)
for j in range(cy1 - cy0 + 2):
    y = j * region.height / (cy1 - cy0 + 1)
    draw.line([(0, y), (region.width, y)], fill=(255, 0, 0), width=1)

region.save(args.out)
print(f"wrote {args.out}  cells x {cx0}..{cx1}, y {cy0}..{cy1}  (cell={cell:.1f}px)")
