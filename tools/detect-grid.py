"""Locate feature edges in an upscaled pixel-art image and infer the grid.

Strong colour transitions in the source land on block boundaries, so the
spacings between edge positions should all be near-multiples of the block
size. Fit a block size + phase that explains the observed edge positions.
"""

import sys

import numpy as np
from PIL import Image

path = sys.argv[1]
img = Image.open(path).convert("RGB")
arr = np.asarray(img).astype(np.int16)
h, w, _ = arr.shape

lum = arr.mean(axis=2)
ink = lum < 128
ys, xs = np.nonzero(ink)
print(f"image: {w}x{h}")
print(f"ink bounding box: x {xs.min()}..{xs.max()} (w {xs.max() - xs.min() + 1}), "
      f"y {ys.min()}..{ys.max()} (h {ys.max() - ys.min() + 1})")

binary = ink.astype(np.int8)
edges = []
for row in binary:
    edges.extend((np.flatnonzero(np.diff(row)) + 1).tolist())
for col in binary.T:
    edges.extend((np.flatnonzero(np.diff(col)) + 1).tolist())
edges = np.array(sorted(edges))
print(f"total edge samples: {len(edges)}")

# Normalised residual: 0.25 means edges are uniformly random with respect to
# this grid, 0 means every edge sits exactly on a boundary.
print("\ncells  block   phase   normalised residual (0.25 = random)")
results = []
for cells in range(24, 97):
    block = w / cells
    best = (1.0, 0.0)
    for phase10 in range(0, int(block * 10)):
        phase = phase10 / 10.0
        resid = np.abs(((edges - phase) / block + 0.5) % 1.0 - 0.5).mean()
        if resid < best[0]:
            best = (resid, phase)
    results.append((best[0], cells, block, best[1]))

for resid, cells, block, phase in sorted(results)[:12]:
    print(f"{cells:5d}  {block:6.2f}  {phase:6.1f}   {resid:34.4f}")

print("\nsame data ordered by cell count:")
for resid, cells, block, phase in results:
    bar = "#" * int((0.25 - resid) * 400)
    print(f"{cells:5d}  {block:6.2f}   {resid:.4f}  {bar}")
