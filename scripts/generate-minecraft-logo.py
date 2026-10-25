"""Generate the outlined stone wordmark. Requires fontTools; no runtime dependency.

The clean MineCrafter outlines are projected onto a tilted face and extruded
inwards/downwards. Cracks are drawn on the stone, not cut through the letters.
The SVG remains sharp at desktop and mobile sizes.
"""

from pathlib import Path
from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
FONT = TTFont(ROOT / "public/minecraft/fonts/Minecrafter.Reg.ttf")
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()


def glyph_contours(letter):
    pen = RecordingPen()
    GLYPHS[CMAP[ord(letter)]].draw(pen)
    contours, current = [], []
    for operation, arguments in pen.value:
        if operation == "moveTo":
            current = [arguments[0]]
        elif operation == "lineTo":
            current.append(arguments[0])
        elif operation == "closePath":
            contours.append(current)
    # The title-screen A uses two eyes and a creeper-shaped counter.
    if letter == "A":
        contours = [contours[0]]
        for left in [213, 393]:
            contours.append(list(reversed([(left, 638), (left + 88, 638), (left + 88, 548), (left, 548)])))
        contours.append(list(reversed([(301, 548), (393, 548), (393, 501), (440, 501),
                         (440, 367), (393, 367), (393, 411), (301, 411),
                         (301, 367), (254, 367), (254, 501), (301, 501)])))
    return contours


def path_data(contours):
    return " ".join("M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in contour) + "Z" for contour in contours)


def polygon(points, **attributes):
    attrs = " ".join(f'{key.replace("_", "-")}="{value}"' for key, value in attributes.items())
    return f'<polygon points="{" ".join(f"{x:.2f},{y:.2f}" for x, y in points)}" {attrs}/>'


def make_line(text, label, top, height, width, depth, perspective):
    shapes, cursor = [], 0
    for letter in text:
        if letter == " ":
            cursor += 180
            continue
        contours = glyph_contours(letter)
        xs = [x for contour in contours for x, _ in contour]
        left, right = min(xs), max(xs)
        shapes.append((letter, contours, cursor, left, right))
        cursor += right - left + 38
    total = cursor - 38
    scale_x = width / total
    origin_x = (1600 - width) / 2

    def front(x, y):
        vertical = (784 - y) / 784
        spread = 1 - perspective + perspective * vertical
        return (800 + (x - 800) * spread, top + vertical * height)

    def back(point):
        x, y = point
        return (800 + (x - 800) * (1 - depth / 900), y + depth)

    projected = []
    definitions, rear, faces = [], [], []
    for index, (letter, contours, offset, left, right) in enumerate(shapes):
        points = [[front(origin_x + (offset + x - left) * scale_x, y) for x, y in contour] for contour in contours]
        projected.append(points)
        key = f"{label}-{index}"
        data = path_data(points)
        definitions.append(f'<path id="{key}" d="{data}" fill-rule="evenodd"/>')
        definitions.append(f'<clipPath id="clip-{key}"><use href="#{key}"/></clipPath>')
        rear.append(f'<path d="{path_data([[back(point) for point in contour] for contour in points])}" fill="#4a413c" fill-rule="evenodd" stroke="#090909" stroke-width="16" stroke-linejoin="round"/>')
        for contour in points:
            for start, end in zip(contour, contour[1:] + contour[:1]):
                dx, dy = end[0] - start[0], end[1] - start[1]
                center = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
                rear_center = back(center)
                # Only the underside and inward-facing side walls are visible.
                # Back-facing hole walls otherwise create spurious triangles.
                if dx * (rear_center[1] - center[1]) - dy * (rear_center[0] - center[0]) >= 0:
                    continue
                shade = "#6f635c" if abs(dx) > abs(dy) else "#3d3531"
                rear.append(polygon([start, end, back(end), back(start)], fill=shade, stroke=shade, stroke_width="1"))
        # A crisp black silhouette and a narrow inner highlight produce the bevel.
        faces.append(f'<use href="#{key}" fill="url(#stone-{label})" stroke="#090909" stroke-width="14" stroke-linejoin="round" paint-order="stroke fill"/>')
        faces.append(f'<g clip-path="url(#clip-{key})"><use href="#{key}" fill="none" stroke="#ede6df" stroke-width="3" transform="translate(2 2)"/>')
        # Thin, sparse fractures; keep every letter's silhouette intact.
        if label == "name":
            local_width = (right - left) * scale_x
            local_x = origin_x + offset * scale_x
            if index % 3 == 0:
                fracture = [(.24, 0), (.24, .15), (.32, .22), (.3, .30)]
            elif index % 3 == 1:
                fracture = [(0, .70), (.32, .70), (.46, .74), (.82, .75), (1, .81)]
            else:
                fracture = [(.76, 1), (.74, .87), (.61, .83), (.6, .72)]
            crack = [front(local_x + x * local_width, (1 - y) * 784) for x, y in fracture]
            d = "M" + "L".join(f"{x:.2f},{y:.2f}" for x, y in crack)
            faces.append(f'<path d="{d}" fill="none" stroke="#eee5dc" stroke-width="3.2" transform="translate(1.5 1.5)"/><path d="{d}" fill="none" stroke="#5a524c" stroke-width="4"/>')
            if index % 2 == 0:
                chip = [front(local_x + local_width * x, y) for x, y in [(.72, 0), (.76, 84), (.81, 0)]]
                faces.append(polygon(chip, fill="#68625c"))
        faces.append(f'<rect x="0" y="0" width="1600" height="352" filter="url(#speckle)" opacity=".55"/><rect x="0" y="0" width="1600" height="352" filter="url(#grain)" style="mix-blend-mode:multiply" opacity=".35"/></g>')
    if label == "name":
        definitions.append('<filter id="speckle" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".35" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 .35  0 0 0 0 .3  0 0 0 0 .27  0 0 0 -2.2 1.05"/></filter>')
    if label == "name":
        definitions.append('<filter id="grain" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".045 .06" numOctaves="4" seed="3" result="n"/><feDiffuseLighting in="n" surfaceScale="2.6" diffuseConstant="1.05" lighting-color="#d9cdc4"><feDistantLight azimuth="235" elevation="55"/></feDiffuseLighting></filter>')
    definitions.append(f'<linearGradient id="stone-{label}" x1="0" y1="{top}" x2="0" y2="{top + height}" gradientUnits="userSpaceOnUse"><stop stop-color="#cdc2ba"/><stop offset=".5" stop-color="#bfb3ab"/><stop offset="1" stop-color="#a99d95"/></linearGradient>')
    return definitions, rear, faces


def main():
    name = make_line("HARSHDEEP ATHAWALE", "name", 12, 180, 1556, 58, .055)
    subtitle = make_line("PORTFOLIO", "subtitle", 236, 88, 814, 18, .025)
    svg = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 352" role="img" aria-label="Harshdeep Athawale — Portfolio"><title>Harshdeep Athawale — Portfolio</title><defs>']
    svg.extend(name[0] + subtitle[0])
    svg.append('</defs>')
    # Render full lines back-to-front so faces stay readable between characters.
    svg.extend(name[1] + name[2] + subtitle[1] + subtitle[2])
    svg.append('</svg>')
    output = ROOT / "public/minecraft/logo.svg"
    output.write_text("".join(svg), encoding="utf-8")
    print(f"Wrote {output.name} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
