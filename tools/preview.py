"""Composite art-source grids straight to PNG for fast authoring iteration.

Bypasses the TypeScript build so a grid edit can be eyeballed immediately.
Colours here are a fixed debug palette approximating the reference art; the
real colourways live in src/art/colorways.ts.

Usage:
    python3 tools/preview.py body/base headwear/cap-h accessory/shades-thug
    python3 tools/preview.py --ref body/base            # side by side with the trace
"""

import argparse
import os

from PIL import Image

ROOT = "packages/hyper-identicons/art-source"
CANVAS = 48
SCALE = 11

LAYER_ORDER = [
    "background",
    "body",
    "clothing",
    "mouth",
    "eyes",
    "accessory",
    "headwear",
]

PALETTE = {
    "o": (17, 17, 17),
    "f": (245, 245, 245),
    "s": (58, 58, 58),
    "l": (255, 255, 255),
    "p": (20, 20, 20),
    "a": (24, 24, 24),
    "b": (54, 54, 54),
    "c": (150, 150, 150),
    "w": (255, 255, 255),
    "k": (17, 17, 17),
    "h": (94, 234, 212),
    "g": (34, 34, 34),
    "e": (255, 255, 255),
    "i": (17, 17, 17),
}


def load(spec):
    path = os.path.join(ROOT, spec + ".txt")
    top = left = 0
    rows = []
    with open(path) as fh:
        for line in fh:
            line = line.rstrip("\n").rstrip()
            if line.startswith("#"):
                continue
            if line.startswith("@"):
                _, t, l = line.split()
                top, left = int(t), int(l)
                continue
            if line:
                rows.append(line)
    widths = {len(r) for r in rows}
    if len(widths) != 1:
        raise SystemExit(f"{spec}: ragged rows, widths seen: {sorted(widths)}")
    if top + len(rows) > CANVAS or left + widths.pop() > CANVAS:
        raise SystemExit(f"{spec}: escapes the {CANVAS}x{CANVAS} canvas")
    return top, left, rows


def composite(specs, backdrop=(255, 255, 255)):
    grid = [[None] * CANVAS for _ in range(CANVAS)]
    for spec in specs:
        top, left, rows = load(spec)
        for y, row in enumerate(rows):
            for x, ch in enumerate(row):
                if ch == ".":
                    continue
                if ch not in PALETTE:
                    raise SystemExit(f"{spec}: unknown slot char {ch!r} at row {y}")
                grid[top + y][left + x] = PALETTE[ch]
    img = Image.new("RGB", (CANVAS, CANVAS), backdrop)
    img.putdata([cell or backdrop for row in grid for cell in row])
    return img


def upscale(img, scale=SCALE):
    return img.resize((img.width * scale, img.height * scale), Image.Resampling.NEAREST)


parser = argparse.ArgumentParser()
parser.add_argument("specs", nargs="+", help="layer/id paths, e.g. body/base")
parser.add_argument("--ref", action="store_true", help="show the traced reference alongside")
parser.add_argument("--out", default="tools/out/preview.png")
args = parser.parse_args()

order = {name: i for i, name in enumerate(LAYER_ORDER)}
specs = sorted(args.specs, key=lambda s: order.get(s.split("/")[0], 99))
img = upscale(composite(specs))

if args.ref and os.path.exists("tools/out/traced-48h.txt"):
    with open("tools/out/traced-48h.txt") as fh:
        lines = [l.rstrip("\n") for l in fh if l.strip()]
    ref = Image.new("RGB", (CANVAS, CANVAS), (255, 255, 255))
    ref.putdata(
        [PALETTE.get(c, (255, 255, 255)) if c != "." else (255, 255, 255)
         for line in lines for c in line]
    )
    ref = upscale(ref)
    pad = 14
    sheet = Image.new("RGB", (img.width + ref.width + pad * 3, img.height + pad * 2), (250, 250, 250))
    sheet.paste(ref, (pad, pad))
    sheet.paste(img, (pad * 2 + ref.width, pad))
    img = sheet

os.makedirs(os.path.dirname(args.out), exist_ok=True)
img.save(args.out)
print(f"wrote {args.out}  layers: {' '.join(specs)}")
