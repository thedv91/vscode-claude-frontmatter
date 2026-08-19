#!/usr/bin/env python3
"""Draws icon.png, the Marketplace icon.

The mark is a frontmatter block that checks out: two rows of three dashes — the
`---` delimiters, drawn as literal dashes so the shape reads as syntax rather
than as a generic list — wrapping a tick.

Earlier drafts filled the middle with field lines instead. They looked right at
128px and turned to mush at the 32px the Marketplace list actually uses; the
tick is the only interior that survives the downscale, and it says what the
extension is for.

Rendered at 4x and downsampled, because PIL antialiases nothing on its own.
"""

from PIL import Image, ImageDraw

SIZE = 128
SCALE = 4
S = SIZE * SCALE

BG = (23, 23, 27, 255)
ACCENT = (224, 120, 90, 255)
TICK = (240, 238, 234, 255)


def px(value: float) -> int:
    """Design units are 128ths, matching the exported size."""
    return round(value * SCALE)


image = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw = ImageDraw.Draw(image)

draw.rounded_rectangle([0, 0, S - 1, S - 1], radius=px(28), fill=BG)


def delimiter(y: float) -> None:
    """One `---` row: three dashes, evenly spaced."""
    dash, gap, height = 24, 8, 8
    x = 22
    for _ in range(3):
        draw.rounded_rectangle(
            [px(x), px(y), px(x + dash), px(y + height)],
            radius=px(height / 2),
            fill=ACCENT,
        )
        x += dash + gap


delimiter(24)
delimiter(96)

# Centred in the 32..96 gap the delimiters leave.
draw.line(
    [(px(44), px(64)), (px(58), px(78)), (px(86), px(48))],
    fill=TICK,
    width=px(10),
    joint="curve",
)

image.resize((SIZE, SIZE), Image.LANCZOS).save("icon.png")
print(f"wrote icon.png ({SIZE}x{SIZE})")
