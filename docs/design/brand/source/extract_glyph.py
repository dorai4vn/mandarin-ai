import sys, json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
out = {}
for name in sys.argv[2:]:
    f = TTFont(f"{sys.argv[1]}/{name}.woff2")
    gs = f.getGlyphSet(); cmap = f.getBestCmap(); g = cmap[ord('草')]
    upm = f['head'].unitsPerEm
    bp = BoundsPen(gs); gs[g].draw(bp); xmin,ymin,xmax,ymax = bp.bounds
    pen = SVGPathPen(gs)
    # flip Y and move bbox to origin
    tp = TransformPen(pen, (1,0,0,-1,-xmin,ymax)); gs[g].draw(tp)
    # count contours
    out[name] = {"d": pen.getCommands(), "w": xmax-xmin, "h": ymax-ymin, "upm": upm,
                 "license": f['name'].getDebugName(13)[:60] if f['name'].getDebugName(13) else None,
                 "family": f['name'].getDebugName(1)}
json.dump(out, open(f"{sys.argv[1]}/glyphs.json","w"))
for k,v in out.items(): print(k, v['family'], round(v['w']), round(v['h']), '|', v['license'])
