"""UI-7A (raster): extracts the approved logo mark (open book + 草 + two leaves) straight from the
official reference image — no redrawing. Background removal = "colour to alpha" against the
locally measured background, so anti-aliased edges keep the original colours on any background.

Usage: python3 extract_raster.py   (writes ../raster/*.png|webp)
Needs: pillow, numpy, scipy.
"""
import os

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "..", "..", "reference", "visual-reference-v2.webp")
OUT = os.path.join(HERE, "..", "raster")
os.makedirs(OUT, exist_ok=True)

# Crop boxes (x0, y0, x1, y1) in the 1448×1086 reference: the mark only, stopping before the
# "M" of the wordmark (mark ends at x 291 / 1007, "M" starts at x 294 / 1013).
BOXES = {"light": (76, 116, 293, 330), "dark": (800, 115, 1011, 330)}
TOL = 7 / 255  # per-channel deviation from the background treated as compression noise


def background(c):
    """Least-squares plane through the crop border (the dark panel has a slight gradient)."""
    h, w, _ = c.shape
    ys, xs = np.mgrid[0:h, 0:w]
    border = np.zeros((h, w), bool)
    border[:3], border[-3:], border[:, :3] = True, True, True
    A = np.c_[xs[border], ys[border], np.ones(border.sum())]
    coef = [np.linalg.lstsq(A, c[..., k][border], rcond=None)[0] for k in range(3)]
    return np.stack([coef[k][0] * xs + coef[k][1] * ys + coef[k][2] for k in range(3)], -1)


def colour_to_alpha(c, bg):
    """Smallest alpha such that c = a*fg + (1-a)*bg with fg inside [0, 1] (GIMP colour-to-alpha)."""
    d = c - bg
    d = np.sign(d) * np.maximum(np.abs(d) - TOL, 0)  # flat-background noise -> exactly bg
    up = np.where(d > 0, d / np.maximum(1 - bg - TOL, TOL), 0)
    down = np.where(d < 0, -d / np.maximum(bg - TOL, TOL), 0)
    a = np.clip(np.maximum(up, down).max(-1), 0, 1)
    fg = bg + d / np.maximum(a, 1e-6)[..., None]
    return np.clip(fg, 0, 1), a


def extract(theme):
    x0, y0, x1, y1 = BOXES[theme]
    ref = np.asarray(Image.open(REF).convert("RGB"), dtype=np.float64) / 255
    c = ref[y0:y1, x0:x1]
    fg, a = colour_to_alpha(c, background(c))
    # Core = solid pieces of the mark (book, glyph, leaves): alpha 1 and the ORIGINAL pixel colour,
    # so light leaves / glossy highlights are not turned semi-transparent. Small enclosed specks
    # (gloss inside a stroke) count as core; the large holes (inside of the book, counters of 草)
    # stay background. Only the anti-aliased rim around the core gets colour-to-alpha.
    lab, _ = ndimage.label(a > 0.35)
    sizes = ndimage.sum(np.ones_like(a), lab, range(1, lab.max() + 1))
    core = np.isin(lab, 1 + np.flatnonzero(sizes >= 300))
    holes, _ = ndimage.label(~core)
    hole_sizes = ndimage.sum(np.ones_like(a), holes, range(1, holes.max() + 1))
    core |= np.isin(holes, 1 + np.flatnonzero(hole_sizes < 12))
    rim = ndimage.binary_dilation(core, iterations=3) & ~core
    a = np.where(core, 1.0, np.where(rim, a, 0.0))
    fg = np.where(core[..., None], c, fg)
    rgba = np.dstack([fg, a])
    ys, xs = np.nonzero(a > 0)
    rgba = rgba[ys.min() : ys.max() + 1, xs.min() : xs.max() + 1]
    return Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA")


def square(img, pad_ratio=0.0):
    """Centres `img` on a transparent square canvas (bbox centre = canvas centre)."""
    side = round(max(img.size) * (1 + 2 * pad_ratio))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
    return canvas


def resize(img, size):
    """Premultiplied-alpha Lanczos resize (no dark/white fringes)."""
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def icon(mark, size, bg, inset, radius_ratio):
    """App icon: `mark` scaled to (1 - 2*inset) of the side, on a rounded (or full-bleed) square."""
    s = round(size * (1 - 2 * inset))
    m = resize(mark, (s, s))
    base = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if bg is not None:
        shape = Image.new("L", (size * 4, size * 4), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(shape).rounded_rectangle(
            [0, 0, size * 4 - 1, size * 4 - 1], radius=round(size * 4 * radius_ratio), fill=255
        )
        fill = Image.new("RGBA", (size, size), bg)
        base.paste(fill, (0, 0), shape.resize((size, size), Image.LANCZOS))
    base.alpha_composite(m, ((size - s) // 2, (size - s) // 2))
    return base


report = {}
marks = {}
for theme in BOXES:
    m = extract(theme)
    report[theme] = m.size
    marks[theme] = sq = square(m)
    m.save(os.path.join(OUT, f"mark-{theme}.png"), optimize=True)
    m.save(os.path.join(OUT, f"mark-{theme}.webp"), lossless=True, quality=100, method=6)
    sq.save(os.path.join(OUT, f"mark-{theme}-square.png"), optimize=True)

# Background colours sampled from the reference panels (light #FDFCFF ≈ white, dark navy).
LIGHT_BG, DARK_BG = (255, 255, 255, 255), (10, 31, 55, 255)
for size in (16, 32, 48):
    # Favicon: transparent, mark as large as possible (light mark reads on both tab themes).
    resize(marks["light"], (size, size)).save(os.path.join(OUT, f"favicon-{size}.png"), optimize=True)
for size in (192, 512):
    icon(marks["light"], size, LIGHT_BG, 0.12, 0.22).save(os.path.join(OUT, f"icon-light-{size}.png"), optimize=True)
    icon(marks["dark"], size, DARK_BG, 0.12, 0.22).save(os.path.join(OUT, f"icon-dark-{size}.png"), optimize=True)
    # Maskable: full-bleed background, mark inside the 80 % safe circle.
    icon(marks["light"], size, LIGHT_BG, 0.2, 0).save(os.path.join(OUT, f"icon-maskable-{size}.png"), optimize=True)
icon(marks["light"], 180, LIGHT_BG, 0.12, 0).save(os.path.join(OUT, "apple-touch-icon-180.png"), optimize=True)
print({k: f"{w}x{h}" for k, (w, h) in report.items()})
