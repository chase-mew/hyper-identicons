"""Render the reference at candidate grid sizes, large, for a fidelity call."""

import sys

from PIL import Image

path = sys.argv[1]
sizes = [40, 48, 56, 64]
target = 384
img = Image.open(path).convert("RGB")

pad = 20
width = target * len(sizes) + pad * (len(sizes) + 1)
height = target + pad * 2
sheet = Image.new("RGB", (width, height), (250, 250, 250))

x = pad
for n in sizes:
    small = img.resize((n, n), Image.Resampling.LANCZOS).quantize(colors=4).convert("RGB")
    big = small.resize((target, target), Image.Resampling.NEAREST)
    sheet.paste(big, (x, pad))
    x += target + pad

out = "tools/out/size-compare-large.png"
sheet.save(out)
print(f"wrote {out}  sizes={sizes} (left to right)")
