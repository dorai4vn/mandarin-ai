import { createHash } from 'node:crypto';
// SYNTHETIC FIXTURES: fabricated for tests only. NOT historical data, NOT real Commons files.
export const SAFE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><title>synthetic</title><path d="M0 0L10 10"/></svg>';
export const sha1of = (t) => createHash('sha1').update(t).digest('hex');
const LIC_URL = {
  'CC BY-SA 4.0': 'https://creativecommons.org/licenses/by-sa/4.0',
  'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/',
  CC0: 'https://creativecommons.org/publicdomain/zero/1.0/',
};
export function page(
  title,
  {
    lic = 'CC BY-SA 4.0',
    author = 'Synthetic Author',
    svg = SAFE_SVG,
    sha1 = sha1of(svg),
    licUrl = LIC_URL[lic] ?? '',
    mime = 'image/svg+xml',
    revid = 1,
  } = {},
) {
  return {
    pageid: revid * 100,
    title,
    revisions: [{ revid, timestamp: '2000-01-01T00:00:00Z' }],
    imageinfo: [
      {
        url: `https://upload.wikimedia.org/wikipedia/commons/synthetic/${encodeURIComponent(title)}`,
        descriptionurl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(title)}`,
        sha1,
        mime,
        extmetadata: {
          LicenseShortName: { value: lic },
          Artist: { value: author ? `<a href="x">${author}</a>` : '' },
          LicenseUrl: { value: licUrl },
        },
      },
    ],
  };
}
export function fakeClient(pages, files = {}) {
  const calls = { list: 0, download: [] };
  return {
    calls,
    async listCategory() {
      calls.list++;
      return { files: pages, complete: true };
    },
    async downloadSvg(u) {
      calls.download.push(u);
      return files[u] ?? SAFE_SVG;
    },
  };
}
