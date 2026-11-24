"""QC sheets for the raster logo set (UI-7A). Usage: python3 qc_raster.py <lockupDir>
(<lockupDir> = output of `node render_lockup.mjs <dir>`). Writes ../previews/raster-*.png."""
import os
import sys

from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, "..", "raster")
P = os.path.join(HERE, "..", "previews")
LK = sys.argv[1]
REF = Image.open(os.path.join(HERE, "..", "..", "reference", "visual-reference-v2.webp")).convert("RGBA")
LABEL_FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"  # labels only, not brand type
F = ImageFont.truetype(LABEL_FONT, 20)
FS = ImageFont.truetype(LABEL_FONT, 14)
BG = {"light": (255, 255, 255, 255), "dark": (10, 31, 55, 255)}
APP = {"light": (245, 248, 254, 255), "dark": (10, 33, 59, 255)}
INK = {"light": (20, 30, 45), "dark": (225, 235, 248)}


def load(n):
    return Image.open(os.path.join(R, n)).convert("RGBA")


def on(img, bg, pad=0):
    c = Image.new("RGBA", (img.width + 2 * pad, img.height + 2 * pad), bg)
    c.alpha_composite(img, (pad, pad))
    return c


def checker(w, h, s=8):
    c = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    d = ImageDraw.Draw(c)
    for y in range(0, h, s):
        for x in range(0, w, s):
            if (x // s + y // s) % 2:
                d.rectangle([x, y, x + s - 1, y + s - 1], fill=(200, 204, 210, 255))
    return c


def zoom(img, k):
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


class Sheet:
    def __init__(self, w, h, bg=(236, 240, 246, 255)):
        self.im = Image.new("RGBA", (w, h), bg)
        self.d = ImageDraw.Draw(self.im)

    def put(self, img, x, y, label=None, ink=(20, 30, 45)):
        self.im.alpha_composite(img, (x, y))
        if label:
            self.d.text((x, y + img.height + 6), label, font=FS, fill=ink)

    def title(self, text, x, y, ink=(20, 30, 45)):
        self.d.text((x, y), text, font=F, fill=ink)

    def save(self, name):
        self.im.convert("RGB").save(os.path.join(P, name), optimize=True)


# 1 — reference vs extracted (2× nearest, so every source pixel is visible).
BOX = {"light": (76, 116, 293, 330), "dark": (800, 115, 1011, 330)}
s = Sheet(2330, 1060)
y = 20
for t in ("light", "dark"):
    m = load(f"mark-{t}.png")
    s.title(f"{t.upper()} — trái: ảnh tham chiếu gốc · tiếp theo: logo đã tách nền trên nền gốc / ô caro (trong suốt) / nền hồng (lộ viền bẩn nếu có) / nền app", 20, y)
    y += 40
    x = 20
    ref = zoom(REF.crop(BOX[t]), 2)
    s.put(ref, x, y, "Gốc (crop từ hình tham chiếu) ×2")
    x += ref.width + 24
    for label, bg in (("Tách nền, đặt lại trên nền gốc", BG[t]), ("Ô caro = trong suốt", None), ("Nền hồng kiểm viền", (255, 0, 200, 255)), ("Nền app " + ("#F5F8FE" if t == "light" else "#0A213B"), APP[t])):
        tile = on(m, bg, 6) if bg else Image.alpha_composite(checker(m.width + 12, m.height + 12), on(m, (0, 0, 0, 0), 6))
        tile = zoom(tile, 2)
        s.put(tile, x, y, label + " ×2")
        x += tile.width + 24
    y += 470
s.save("raster-01-compare-reference.png")

# 2 — sizes 16/32/48/64/192/512 on Light and Dark backgrounds (actual size; small ones also ×4).
def fit(img, size):
    side = max(img.size)
    return img.convert("RGBa").resize((round(img.width * size / side), round(img.height * size / side)), Image.LANCZOS).convert("RGBA")


s = Sheet(1900, 1520)
y = 20
for t in ("light", "dark"):
    sq = load(f"mark-{t}-square.png")
    panel = Image.new("RGBA", (1860, 720), APP[t])
    s.put(panel, 20, y)
    s.title(f"{t.upper()} — kích thước thật (hàng trên) và phóng ×4 điểm ảnh (16–64 px)", 40, y + 14, INK[t])
    x = 40
    for size in (16, 32, 48, 64, 192):
        img = fit(sq, size)
        s.put(img, x, y + 60, f"{size} px", INK[t])
        if size <= 64:
            z = zoom(img, 4)
            s.put(z, x, y + 290, f"{size} px ×4", INK[t])
            x += max(z.width, img.width) + 30
        else:
            x += img.width + 30
    s.put(fit(sq, 512), x, y + 60, "512 px (phóng to ~2,5× từ ảnh gốc ~205 px)", INK[t])
    y += 750
s.save("raster-02-sizes.png")

# 3 — app icons + favicons in a tab bar.
s = Sheet(1780, 1080)
s.title("Icon app 512 / 192 px (Light, Dark, Maskable cắt tròn) — Favicon 16/32/48 px trong thanh tab", 20, 16)
x = 20
for n in ("icon-light-512", "icon-dark-512"):
    img = load(n + ".png")
    s.put(img, x, 60, n + ".png")
    x += 536
mk = load("icon-maskable-512.png")
mask = Image.new("L", mk.size, 0)
ImageDraw.Draw(mask).ellipse([0, 0, 511, 511], fill=255)
circ = Image.new("RGBA", mk.size, (0, 0, 0, 0))
circ.paste(mk, (0, 0), mask)
s.put(circ, x, 60, "icon-maskable-512.png (cắt tròn như Android)")
x = 20
for n in ("icon-light-192", "icon-dark-192", "icon-maskable-192", "apple-touch-icon-180"):
    img = load(n + ".png")
    s.put(img, x, 620, n + ".png")
    x += 230
for i, t in enumerate(("light", "dark")):
    bar = Image.new("RGBA", (780, 52), (222, 227, 235, 255) if t == "light" else (32, 36, 44, 255))
    d = ImageDraw.Draw(bar)
    d.rounded_rectangle([8, 8, 300, 51], 8, fill=(255, 255, 255, 255) if t == "light" else (52, 58, 70, 255))
    bar.alpha_composite(load("favicon-16.png"), (20, 22))
    d.text((44, 18), "Mandarin AI", font=FS, fill=INK[t])
    bar.alpha_composite(load("favicon-32.png"), (330, 10))
    bar.alpha_composite(load("favicon-48.png"), (380, 2))
    s.put(bar, 960, 640 + i * 90, f"Thanh tab {t}: favicon 16 px (thật), 32 px, 48 px", (20, 30, 45))
    s.put(zoom(load("favicon-16.png"), 4), 1560, 630 + i * 90)
s.save("raster-03-icons.png")

# 4 — lockup: extracted mark + real text (Nunito 800 / 600) vs the reference.
s = Sheet(1420, 1300)
s.title("Lockup: biểu tượng (ảnh gốc) + chữ thật Nunito 800 / 600 — so với hình tham chiếu", 20, 16)
for i, t in enumerate(("light", "dark")):
    y = 60 + i * 620
    full = (76, 110, 690, 330) if t == "light" else (800, 110, 1410, 330)
    side = (36, 530, 232, 596) if t == "light" else (756, 532, 932, 596)
    s.put(REF.crop(full), 20, y + 30, "Tham chiếu (lockup lớn, 1×)")
    s.put(Image.open(os.path.join(LK, f"lockup-full-{t}-h200@1x.png")).convert("RGBA"), 660, y, "Bản mới — lockup cao 200 px @1x")
    s.put(zoom(REF.crop(side), 2), 20, y + 340, "Tham chiếu (sidebar) ×2")
    s.put(Image.open(os.path.join(LK, f"lockup-sidebar-{t}-h48@2x.png")).convert("RGBA"), 440, y + 330, "Bản mới — sidebar 48 px @2x")
    s.put(Image.open(os.path.join(LK, f"lockup-sidebar-{t}-h40@1x.png")).convert("RGBA"), 920, y + 340, "Sidebar 40 px @1x")
s.save("raster-04-lockup-real-text.png")
print("ok")
