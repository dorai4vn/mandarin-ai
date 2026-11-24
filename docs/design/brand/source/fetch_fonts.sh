#!/usr/bin/env bash
# Downloads Nunito 600 + 800 (SIL Open Font License 1.1, Google Fonts) — subsets latin,
# latin-ext and vietnamese — for the lockup preview, plus a local @font-face CSS (fonts/nunito.css).
# The app itself loads Nunito through next/font/google (self-hosted at build) in UI-7B.
set -euo pipefail
cd "$(dirname "$0")" && mkdir -p fonts && cd fonts
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36"
curl -fsS -A "$UA" "https://fonts.googleapis.com/css2?family=Nunito:wght@600;800&display=swap" -o google.css
python3 - <<'PY'
import re, urllib.request
css = open("google.css").read()
out = []
for block in re.findall(r"/\* ([\w-]+) \*/\s*(@font-face \{.*?\})", css, re.S):
    subset, rule = block
    if subset not in ("latin", "latin-ext", "vietnamese"):
        continue
    w = re.search(r"font-weight: (\d+)", rule).group(1)
    url = re.search(r"url\((https://[^)]+)\)", rule).group(1)
    name = f"nunito-{w}-{subset}.woff2"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    open(name, "wb").write(urllib.request.urlopen(req).read())
    out.append(f"/* {subset} */\n" + rule.replace(url, name))
open("nunito.css", "w").write("\n".join(out) + "\n")
print(len(out), "font files")
PY
rm google.css
