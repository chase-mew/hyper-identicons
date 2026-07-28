"""Print a labelled sub-rectangle of a traced grid, for reading exact coordinates."""

import argparse

p = argparse.ArgumentParser()
p.add_argument("path")
p.add_argument("--rows", default="0:48")
p.add_argument("--cols", default="0:48")
args = p.parse_args()

r0, r1 = (int(v) for v in args.rows.split(":"))
c0, c1 = (int(v) for v in args.cols.split(":"))
grid = [line.rstrip("\n") for line in open(args.path)]

print("     " + "".join(str(c // 10) for c in range(c0, c1)))
print("     " + "".join(str(c % 10) for c in range(c0, c1)))
for y in range(r0, r1):
    print(f"{y:3d}  {grid[y][c0:c1]}")
