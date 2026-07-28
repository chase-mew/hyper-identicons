"""Label connected ink regions in the traced grid to guide layer separation."""

import sys
from collections import deque

import numpy as np
from PIL import Image

path = sys.argv[1] if len(sys.argv) > 1 else "tools/out/traced-48h.txt"
with open(path) as fh:
    lines = [l.rstrip("\n") for l in fh if l.strip("\n")]
N = len(lines)
grid = np.array([[c for c in line] for line in lines])

ink = (grid == "o") | (grid == "h")
label = np.full((N, N), -1, dtype=int)
sizes = []
for sy in range(N):
    for sx in range(N):
        if not ink[sy, sx] or label[sy, sx] >= 0:
            continue
        cid = len(sizes)
        q = deque([(sy, sx)])
        label[sy, sx] = cid
        count = 0
        while q:
            y, x = q.popleft()
            count += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < N and 0 <= nx < N and ink[ny, nx] and label[ny, nx] < 0:
                    label[ny, nx] = cid
                    q.append((ny, nx))
        sizes.append(count)

order = sorted(range(len(sizes)), key=lambda c: -sizes[c])
print(f"{len(sizes)} ink components")
for rank, cid in enumerate(order[:14]):
    ys, xs = np.nonzero(label == cid)
    print(f"  #{rank:2d} id={cid:3d} size={sizes[cid]:4d}  rows {ys.min():2d}..{ys.max():2d}  cols {xs.min():2d}..{xs.max():2d}")

SYMS = "ABCDEFGHIJKLMN"
rank_of = {cid: r for r, cid in enumerate(order)}
print("\n     " + "".join(str(i // 10) for i in range(N)))
print("     " + "".join(str(i % 10) for i in range(N)))
for y in range(N):
    row = ""
    for x in range(N):
        if not ink[y, x]:
            row += "f" if grid[y, x] == "f" else "."
        else:
            r = rank_of[label[y, x]]
            row += SYMS[r] if r < len(SYMS) else "?"
    print(f"{y:3d}  {row}")

colors = [
    (220, 60, 60), (60, 120, 220), (60, 180, 90), (220, 160, 40),
    (160, 80, 200), (40, 190, 190), (230, 110, 170), (120, 120, 120),
    (150, 90, 40), (90, 150, 40), (200, 200, 60), (100, 60, 160),
    (60, 200, 140), (200, 90, 90),
]
img = Image.new("RGB", (N, N), (255, 255, 255))
px = []
for y in range(N):
    for x in range(N):
        if ink[y, x]:
            px.append(colors[rank_of[label[y, x]] % len(colors)])
        elif grid[y, x] == "f":
            px.append((240, 240, 240))
        else:
            px.append((255, 255, 255))
img.putdata(px)
img.resize((N * 12, N * 12), Image.Resampling.NEAREST).save("tools/out/components.png")
print("\nwrote tools/out/components.png")
