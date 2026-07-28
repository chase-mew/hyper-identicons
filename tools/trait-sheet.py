"""Render every trait over the base cat, labelled, so the whole set can be audited."""

import json
import os

from PIL import Image, ImageDraw

import importlib.util

spec = importlib.util.spec_from_file_location("prev", "tools/preview.py")

ROOT = "packages/hyper-identicons/art-source"
CANVAS = 48
SCALE = 5
PAD = 8
LABEL = 14

# Reuse preview.py's loader without running its CLI.
import types

src = open("tools/preview.py").read().split("parser = argparse.ArgumentParser()")[0]
mod = types.ModuleType("prev")
exec(compile(src, "tools/preview.py", "exec"), mod.__dict__)

manifest = json.load(open(os.path.join(ROOT, "manifest.json")))["layers"]

panels = []
for layer, entries in manifest.items():
    for entry in entries:
        spec_path = f"{layer}/{entry['id']}"
        specs = ["body/base"]
        if layer != "body":
            specs.append(spec_path)
        # Give face traits a neutral base so they are not read against bare fur.
        if layer in ("mouth", "eyes", "accessory", "headwear", "clothing"):
            specs.append("mouth/neutral")
        order = {n: i for i, n in enumerate(mod.LAYER_ORDER)}
        specs = sorted(set(specs), key=lambda s: order[s.split("/")[0]])
        img = mod.composite(specs).resize((CANVAS * SCALE, CANVAS * SCALE), Image.Resampling.NEAREST)
        panels.append((f"{layer}/{entry['id']}", img))

cols = 8
rows = (len(panels) + cols - 1) // cols
cell_w = CANVAS * SCALE + PAD
cell_h = CANVAS * SCALE + PAD + LABEL
sheet = Image.new("RGB", (cols * cell_w + PAD, rows * cell_h + PAD), (248, 248, 248))
draw = ImageDraw.Draw(sheet)

for i, (name, img) in enumerate(panels):
    x = PAD + (i % cols) * cell_w
    y = PAD + (i // cols) * cell_h
    sheet.paste(img, (x, y))
    draw.text((x + 1, y + CANVAS * SCALE + 2), name, fill=(40, 40, 40))

out = "tools/out/traits.png"
sheet.save(out)
print(f"wrote {out}  {len(panels)} traits")
