"""Pixel-art project icons in the Minecraft item style (16x16, scaled 8x with nearest neighbour).

    python -I scripts/generate-project-icons.py
"""
import math
from pathlib import Path
from PIL import Image

OUT = Path(__file__).resolve().parents[1] / "public/minecraft/images/projects"
SCALE = 8
OUTLINE = (24, 20, 28, 255)


def rgba(hex_):
    return tuple(int(hex_[i:i + 2], 16) for i in (1, 3, 5)) + (255,)


def outline(img):
    """Add the 1px dark rim every Minecraft item has, inside the 16x16 canvas."""
    px = img.load()
    w, h = img.size
    rim = []
    for y in range(h):
        for x in range(w):
            if px[x, y][3] == 0:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < w and 0 <= ny < h) or px[nx, ny][3] == 0:
                    rim.append((x, y))
                    break
    return rim


def finish(img, name):
    px = img.load()
    for x, y in outline(img):
        r, g, b, _ = px[x, y]
        px[x, y] = tuple(int(c * .45) for c in (r, g, b)) + (255,)  # darker version of its own colour
    img.resize((16 * SCALE, 16 * SCALE), Image.NEAREST).save(OUT / f"{name}.png")


def shield():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    spans = {1: (2, 13), 2: (2, 13), 3: (2, 13), 4: (2, 13), 5: (2, 13), 6: (2, 13), 7: (2, 13), 8: (3, 12), 9: (3, 12),
             10: (4, 11), 11: (5, 10), 12: (6, 9), 13: (7, 8)}
    for y, (a, b) in spans.items():
        for x in range(a, b + 1):
            edge = x in (a, b) or y == 1 or (y, x) in ()
            if x <= (a + b) / 2 - 1 and y < 10:
                base = rgba("#d6dbe3")  # lit side
            else:
                base = rgba("#8b95a5")
            px[x, y] = base
    # blue banner field inside the rim
    for y in range(3, 11):
        a, b = spans[y]
        for x in range(a + 2, b - 1):
            px[x, y] = rgba("#3f63c9") if x < 8 else rgba("#2f4aa3")
    # highlight pixels on the rim
    for x in range(3, 8):
        px[x, 1] = rgba("#f4f7fb")
    # lightning bolt = "blocked at the edge"
    for x, y in [(9, 3), (8, 3), (8, 4), (7, 4), (7, 5), (8, 5), (9, 5), (8, 6), (7, 6), (7, 7), (6, 7), (7, 8), (6, 8), (6, 9)]:
        px[x, y] = rgba("#ffe45c") if (x + y) % 2 else rgba("#ffc21a")
    px[6, 9] = rgba("#ff9d00")
    finish(img, "waf")


def deepfake():
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    skin, hair, white, eye, nose, mouth = (rgba(c) for c in ("#c68e6a", "#4a2f1a", "#f2f2f2", "#4d5fd6", "#a56e4d", "#7a4733"))
    face = ["HHHHHHHH", "HHHHHHHH", "HSSSSSSH", "SSSSSSSS", "SWESSEWS", "SSSNNSSS", "SSMMMMSS", "SSSSSSSS"]
    palette = {"H": hair, "S": skin, "W": white, "E": eye, "N": nose, "M": mouth}
    for fy, row in enumerate(face):
        for fx, ch in enumerate(row):
            for dy in range(2):
                for dx in range(2):
                    px[fx * 2 + dx, fy * 2 + dy] = palette[ch]
    # glitch: the lower rows slip sideways, with a magenta and a cyan fringe at the tear
    for y in (11, 12):
        row = [px[x, y] for x in range(16)]
        for x in range(16):
            px[x, y] = row[(x - 3) % 16]
    for y, colour in ((11, "#ff55ff"), (12, "#55ffff")):
        for x in range(3):
            px[x, y] = rgba(colour)
    # scan line across the forehead and white corner brackets
    for x in range(16):
        px[x, 5] = rgba("#55ff55")
        r, g, b, _ = px[x, 6]
        px[x, 6] = (int(r * .55 + 35), int(g * .55 + 100), int(b * .55 + 35), 255)
    for x, y in [(0, 0), (1, 0), (0, 1), (15, 0), (14, 0), (15, 1), (0, 15), (1, 15), (0, 14), (15, 15), (14, 15), (15, 14)]:
        px[x, y] = rgba("#ffffff")
    finish(img, "deepfake")


def helix():
    """A double helix built from 2x2 'blocks': cyan and gold strands joined by stone-grey base pairs."""
    img = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = img.load()
    cyan, gold, stone = rgba("#4fe3e3"), rgba("#ffb62e"), rgba("#8d90a0")

    def block(cx, cy, colour):
        for dy in range(2):
            for dx in range(2):
                shade = colour
                if dx == 0 and dy == 0:
                    shade = tuple(min(255, int(c * 1.25)) for c in colour[:3]) + (255,)
                elif dx == 1 and dy == 1:
                    shade = tuple(int(c * .75) for c in colour[:3]) + (255,)
                px[1 + cx * 2 + dx, 1 + cy * 2 + dy] = shade

    rows = 7
    for r in range(rows):
        phase = r * 2 * math.pi / rows
        a = round(3 + 3.0 * math.sin(phase))
        b = round(3 - 3.0 * math.sin(phase))
        if abs(a - b) >= 5:
            for x in range(min(a, b) + 1, max(a, b)):
                block(x, r, stone)
        front_a = math.cos(phase) >= 0
        first, second = ((b, gold), (a, cyan)) if front_a else ((a, cyan), (b, gold))
        block(first[0], r, first[1])
        block(second[0], r, second[1])
    # rim goes on the outside of the blocks so the 2px strands keep their colour
    rim = []
    for y in range(16):
        for x in range(16):
            if px[x, y][3] == 0 and any(0 <= x + dx < 16 and 0 <= y + dy < 16 and px[x + dx, y + dy][3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                rim.append((x, y))
    for x, y in rim:
        px[x, y] = OUTLINE
    img.resize((16 * SCALE, 16 * SCALE), Image.NEAREST).save(OUT / "behavior-dna.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    shield(); deepfake(); helix()
    print("wrote", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))
