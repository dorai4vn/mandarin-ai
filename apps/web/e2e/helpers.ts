import { expect, type Page, type TestInfo } from '@playwright/test';
import { SignJWT } from 'jose';
import { E2E_JWT_SECRET } from '../playwright.config';

/** Supabase-shaped HS256 access token accepted by the test API instance. */
export async function devToken(sub = crypto.randomUUID()): Promise<string> {
  return new SignJWT({ role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setAudience('authenticated')
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(new TextEncoder().encode(E2E_JWT_SECRET));
}

/** Signs the page in with a dev token (sessionStorage) before any script runs. */
export async function signIn(page: Page, sub?: string) {
  const token = await devToken(sub);
  await page.addInitScript((t) => sessionStorage.setItem('mandarin.devAccessToken', t), token);
}

export type DeviceClass = 'phone' | 'tablet' | 'desktop';
export function deviceClass(page: Page): DeviceClass {
  const w = page.viewportSize()?.width ?? 1440;
  return w < 768 ? 'phone' : w < 1280 ? 'tablet' : 'desktop';
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow, 'page must not scroll horizontally').toBeLessThanOrEqual(1);
}

export async function screenshot(page: Page, info: TestInfo, name: string) {
  const body = await page.screenshot({ fullPage: true });
  await info.attach(`${info.project.name}-${name}`, { body, contentType: 'image/png' });
}

type Pt = [number, number];
/** SYNTHETIC 山 strokes in a 0..1 box (centre stroke, left + bottom, right). */
export const SHAN: Pt[][] = [
  [
    [0.5, 0.08],
    [0.5, 0.86],
  ],
  [
    [0.16, 0.35],
    [0.16, 0.86],
    [0.84, 0.86],
  ],
  [
    [0.84, 0.35],
    [0.84, 0.86],
  ],
];
export const YI: Pt[][] = [
  [
    [0.1, 0.5],
    [0.9, 0.5],
  ],
];

function densify(stroke: Pt[], steps = 12): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < stroke.length - 1; i++) {
    const [a, b] = [stroke[i]!, stroke[i + 1]!];
    for (let s = 0; s < steps; s++)
      out.push([a[0] + ((b[0] - a[0]) * s) / steps, a[1] + ((b[1] - a[1]) * s) / steps]);
  }
  out.push(stroke[stroke.length - 1]!);
  return out;
}

/**
 * Draws strokes on the canvas. `mouse` uses Playwright's real mouse input; `touch`/`pen`
 * dispatch PointerEvents with that pointerType (same code path the browser uses for fingers/pens).
 */
export async function drawStrokes(
  page: Page,
  strokes: Pt[][],
  pointerType: 'mouse' | 'touch' | 'pen',
) {
  const canvas = page.getByTestId('handwriting-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  const abs = strokes.map((s) =>
    densify(s).map(([x, y]) => [box.x + x * box.width, box.y + y * box.height] as Pt),
  );
  if (pointerType === 'mouse') {
    for (const s of abs) {
      await page.mouse.move(s[0]![0], s[0]![1]);
      await page.mouse.down();
      for (const [x, y] of s.slice(1)) await page.mouse.move(x, y);
      await page.mouse.up();
    }
    return;
  }
  await canvas.evaluate(
    (el, { strokes: ss, type }) => {
      let id = 10;
      for (const s of ss) {
        id += 1;
        const fire = (kind: string, [x, y]: number[]) =>
          el.dispatchEvent(
            new PointerEvent(kind, {
              pointerId: id,
              pointerType: type,
              clientX: x,
              clientY: y,
              bubbles: true,
              isPrimary: true,
              pressure: 0.5,
              buttons: 1,
            }),
          );
        fire('pointerdown', s[0]!);
        for (const p of s.slice(1)) fire('pointermove', p);
        fire('pointerup', s[s.length - 1]!);
      }
    },
    { strokes: abs, type: pointerType },
  );
}

/** Minimal valid-looking PDF bytes (self-authored fixture). */
export const SAMPLE_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
);
