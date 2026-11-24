"""Builds the Mandarin AI logo set (UI-7A) as self-contained SVG (no font dependency).

- 草 outline: LXGW WenKai TC Bold (SIL OFL 1.1), converted to a path.
- Wordmark: Inter ExtraBold / Bold (SIL OFL 1.1), shaped with HarfBuzz, converted to paths.
- Book + leaves: hand-built curves following the approved reference image.
"""
import json, os, re, sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

HERE = os.path.dirname(os.path.abspath(__file__))
FONTS = os.path.join(HERE, "fonts")  # downloaded by fetch_fonts.sh, not committed
OUT = os.path.join(HERE, "..", "svg")
os.makedirs(OUT, exist_ok=True)
glyphs = json.load(open(os.path.join(FONTS, "glyphs.json")))
CAO = glyphs["wenkai"]

THEMES = {
    "light": {
        "book": ["#0A8F67", "#16A453", "#86D41C"],
        "accent": ["#5CC23A", "#A6E22A"],
        "leaf": ["#3BAA2F", "#9BE21C"],
        "vein": "#EAFBD3",
        "glyph": "#0B7347",
        "title": "#0A1B2F",
        "tagline": "#3E4E64",
        "bg": "#FFFFFF",
    },
    "dark": {
        "book": ["#33DDFB", "#2FD9B0", "#72E36A"],
        "accent": ["#3FE0B8", "#9BEA4A"],
        "leaf": ["#2FC45A", "#8FEA3C"],
        "vein": "#E9FFE0",
        "glyph": "#FFFFFF",
        "title": "#FFFFFF",
        "tagline": "#B9C8DC",
        "bg": "#0A1A2E",
    },
}


def text_paths(font_file, text, size, x, y, tracking=0.0, fill="#000"):
    """Shapes `text` with HarfBuzz and returns (svg <path>, advance width) in user units."""
    path = os.path.join(FONTS, font_file)
    blob = hb.Blob.from_file_path(path)
    face = hb.Face(blob)
    font = hb.Font(face)
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {"kern": True, "liga": True})
    tt = TTFont(path)
    gs = tt.getGlyphSet()
    order = tt.getGlyphOrder()
    upm = tt["head"].unitsPerEm
    s = size / upm
    pen = SVGPathPen(gs)
    cx = 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        tp = TransformPen(pen, (s, 0, 0, -s, x + (cx + pos.x_offset) * s, y - pos.y_offset * s))
        gs[name].draw(tp)
        cx += pos.x_advance + tracking * upm / size * 0  # tracking added below in user units
        x += tracking
    width = cx * s + tracking * (len(buf.glyph_infos) - 1)
    return f'<path fill="{fill}" d="{pen.getCommands()}"/>', width


def advance(font_file, text, size):
    _, w = text_paths(font_file, text, size, 0, 0)
    return w


def mark(theme, simple=False, ids="m"):
    """Book + 草 + two leaves in a 128×128 box. `simple`: small-size variant (same concept)."""
    t = THEMES[theme]
    sw = 11 if simple else 7.2
    defs = f"""
  <linearGradient id="{ids}-book" x1="10" y1="40" x2="118" y2="118" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{t['book'][0]}"/><stop offset=".55" stop-color="{t['book'][1]}"/><stop offset="1" stop-color="{t['book'][2]}"/>
  </linearGradient>
  <linearGradient id="{ids}-accent" x1="56" y1="124" x2="120" y2="106" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{t['accent'][0]}"/><stop offset="1" stop-color="{t['accent'][1]}"/>
  </linearGradient>
  <linearGradient id="{ids}-leaf" x1="88" y1="30" x2="128" y2="4" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="{t['leaf'][0]}"/><stop offset="1" stop-color="{t['leaf'][1]}"/>
  </linearGradient>"""
    book = f"""
  <g fill="none" stroke="url(#{ids}-book)" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M84 40 C64 35 36 38 14 46 C13 68 12 88 10 106 C30 102 50 105 66 114 C84 121 100 114 113 104"/>
    <path d="M110 42 C111 64 112 86 113 104"/>
    <path d="M110 42 C110 36 110 31 109.6 27"/>
  </g>"""
    accent = "" if simple else f"""
  <path d="M56 121 C78 126 100 119 119 108" fill="none" stroke="url(#{ids}-accent)" stroke-width="3.6" stroke-linecap="round"/>"""
    leaves = f"""
  <path fill="url(#{ids}-leaf)" d="M109.4 29.5 C98.6 30.6 88.8 24.4 85.6 12.6 C97.8 12.6 106.4 19.6 109.4 29.5 Z"/>
  <path fill="url(#{ids}-leaf)" d="M110 27.4 C109.4 14.6 117.4 5.2 127.6 4.2 C128 17.2 120.2 26.4 110 27.4 Z"/>"""
    veins = "" if simple else f"""
  <g fill="none" stroke="{t['vein']}" stroke-width="1.15" stroke-linecap="round" opacity=".75">
    <path d="M108 28.4 C101.6 25.4 95 20.6 89.6 15.2"/><path d="M111.2 25.6 C114.4 17.6 119.2 11 125 6.8"/>
  </g>"""
    # Small variant: same glyph, larger share of the book so its main strokes survive at 24-32 px.
    gh = 70 if simple else 58
    s = gh / CAO["h"]
    gw = CAO["w"] * s
    gx = (62 if simple else 63) - gw / 2
    gy = 44 if simple else 49
    glyph = f"""
  <path fill="{t['glyph']}" stroke="{t['glyph']}" stroke-width="{(2.2 if simple else 1.7) / s:.1f}" stroke-linejoin="round" transform="translate({gx:.2f} {gy:.2f}) scale({s:.5f})" d="{CAO['d']}"/>"""
    return defs, book + accent + leaves + veins + glyph


def svg_mark(theme, simple=False, size=128, bg=None, pad=0.0, rx=0, center=False):
    defs, body = mark(theme, simple, ids=f"{theme}{'s' if simple else ''}")
    if center:
        # Optical centre: the leaves extend the box to the right/top (bbox x 6-128, y 4-126).
        body = f'<g transform="translate(-4.5 -1)">{body}</g>'
    vb = 128 + 2 * pad
    bgrect = f'<rect x="{-pad}" y="{-pad}" width="{vb}" height="{vb}" rx="{rx}" fill="{bg}"/>' if bg else ""
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="{-pad} {-pad} {vb} {vb}" width="{size}" height="{size}" role="img" aria-label="Mandarin AI">
<title>Mandarin AI</title><defs>{defs}</defs>{bgrect}{body}
</svg>
"""


def svg_lockup(theme, compact=False):
    """Horizontal lockup. `compact`: sidebar/header proportions (bigger text vs mark) so the
    tagline stays readable when the whole lockup is ~40-48 px tall."""
    t = THEMES[theme]
    defs, body = mark(theme, ids=f"{theme}{'C' if compact else 'L'}")
    x0 = 140 if compact else 138
    title_size = 54 if compact else 42
    title_w = advance("inter800.ttf", "Mandarin AI", title_size)
    tag = "TỰ HỌC TIẾNG TRUNG"
    tag_size = 24 if compact else 16.5
    raw = advance("inter600.ttf", tag, tag_size)
    target = title_w * (1.0 if compact else 0.94)
    tracking = (target - raw) / (len(tag) - 1)
    title, _ = text_paths("inter800.ttf", "Mandarin AI", title_size, x0, 70 if compact else 73, fill=t["title"])
    tagp, tw = text_paths("inter600.ttf", tag, tag_size, x0 + (title_w - target) / 2, 108 if compact else 101, tracking=tracking, fill=t["tagline"])
    width = x0 + title_w + 6
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.1f} 128" width="{width * 2:.0f}" height="256" role="img" aria-label="Mandarin AI — Tự học tiếng Trung">
<title>Mandarin AI — Tự học tiếng Trung</title><defs>{defs}</defs>{body}
{title}
{tagp}
</svg>
""", {"title_w": title_w, "tracking": tracking, "tag_w": tw}


def _r(svg):
    """Round path coordinates to 2 decimals (smaller files, visually identical)."""
    return re.sub(r"-?\d+\.\d{3,}", lambda m: f"{float(m.group()):.2f}".rstrip("0").rstrip("."), svg)


files = {}
for th in THEMES:
    files[f"mark-{th}.svg"] = svg_mark(th)
    files[f"mark-{th}-small.svg"] = svg_mark(th, simple=True)
    lock, meta = svg_lockup(th)
    files[f"lockup-{th}.svg"] = lock
    files[f"lockup-compact-{th}.svg"], _ = svg_lockup(th, compact=True)
# App icons: rounded square (any) + full-bleed maskable (mark inside the 80 % safe zone).
files["app-icon-light.svg"] = svg_mark("light", bg="#FFFFFF", pad=20, rx=38, size=512, center=True)
files["app-icon-dark.svg"] = svg_mark("dark", bg="#0A1A2E", pad=20, rx=38, size=512, center=True)
files["app-icon-maskable.svg"] = svg_mark("light", bg="#FFFFFF", pad=46, rx=0, size=512, center=True)
files["favicon-small.svg"] = svg_mark("light", simple=True, bg="#FFFFFF", pad=8, rx=24, size=32, center=True)
for name, content in files.items():
    open(os.path.join(OUT, name), "w").write(_r(content))
print(json.dumps({"files": sorted(files), "lockup": meta}, indent=1))
