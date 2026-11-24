#!/usr/bin/env bash
# Downloads the minimal font subsets used to build the logo (all SIL Open Font License 1.1):
#   LXGW WenKai TC Bold (glyph 草) · Inter 800 ("Mandarin AI") · Inter 600 (tagline)
# Then: python3 extract_glyph.py fonts wenkai && python3 build_logo.py
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
get() { # family-query output-name text
  local css url
  css=$(curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?family=$1&text=$3")
  url=$(printf '%s' "$css" | grep -oE 'https://[^)]+' | head -1)
  curl -fsS -A "$UA" -o "$2.woff2" "$url"
}
get "LXGW+WenKai+TC:wght@700" wenkai "%E8%8D%89"
get "Inter:wght@800" inter800 "Mandarin%20AI"
get "Inter:wght@600" inter600 "T%E1%BB%B0%20H%E1%BB%8CC%20TI%E1%BA%BENG%20TRUNG"
python3 - <<'PY'
from fontTools.ttLib import TTFont
for n in ["inter800", "inter600"]:
    f = TTFont(f"{n}.woff2"); f.flavor = None; f.save(f"{n}.ttf")
PY
