import { defineConfig, devices, type Project } from '@playwright/test';

/**
 * Cross-browser × responsive matrix (D-028, D-030): Chromium, Firefox, WebKit at
 * phone 390×844, tablet 820×1180, desktop 1440×900. Real-device checks stay manual.
 */
export const E2E_JWT_SECRET = 'e2e-only-secret-not-used-anywhere-else-0123456789';
const API_PORT = 8787;
const WEB_PORT = 3000;

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 820, height: 1180 },
  desktop: { width: 1440, height: 900 },
} as const;

const fakeMediaChromium = ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'];
const fakeMediaFirefox = {
  'media.navigator.streams.fake': true,
  'media.navigator.permission.disabled': true,
};

function project(engine: 'chromium' | 'firefox' | 'webkit', size: keyof typeof VIEWPORTS): Project {
  const touch = size !== 'desktop';
  const base =
    engine === 'chromium'
      ? devices['Desktop Chrome']
      : engine === 'firefox'
        ? devices['Desktop Firefox']
        : devices['Desktop Safari'];
  return {
    name: `${engine}-${size}`,
    use: {
      ...base,
      viewport: VIEWPORTS[size],
      hasTouch: touch,
      // Firefox does not support isMobile emulation.
      isMobile: engine !== 'firefox' && size === 'mobile',
      deviceScaleFactor: size === 'desktop' ? 1 : 2,
      ...(engine === 'chromium'
        ? { launchOptions: { args: fakeMediaChromium }, permissions: ['microphone'] }
        : {}),
      ...(engine === 'firefox' ? { launchOptions: { firefoxUserPrefs: fakeMediaFirefox } } : {}),
    },
  };
}

const ENGINES = (process.env.E2E_ENGINES ?? 'chromium,firefox,webkit').split(',') as Array<
  'chromium' | 'firefox' | 'webkit'
>;

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  retries: process.env.CI ? 1 : 0,
  // A test that only passes on retry is reported as a FAILURE, never hidden as green.
  failOnFlakyTests: Boolean(process.env.CI),
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'off',
    serviceWorkers: 'block',
    locale: 'vi-VN',
  },
  projects: [
    ...ENGINES.flatMap((e) => (['mobile', 'tablet', 'desktop'] as const).map((s) => project(e, s))),
    // UI-3 (RESPONSIVE_V2 §1): extra viewports for layout/shell checks only — smallest phone,
    // phone landscape (low height) and the 1024 desktop boundary (collapsed sidebar).
    ...ENGINES.flatMap((e) =>
      (
        [
          ['small', { width: 320, height: 568 }, 'mobile'],
          ['landscape', { width: 844, height: 390 }, 'mobile'],
          ['phone-low', { width: 740, height: 360 }, 'mobile'],
          ['laptop', { width: 1024, height: 768 }, 'desktop'],
        ] as const
      ).map(([name, viewport, like]) => {
        const p = project(e, like);
        return {
          ...p,
          name: `${e}-${name}`,
          testMatch: /(layout|shell)\.spec\.ts$/,
          use: { ...p.use, viewport },
        };
      }),
    ),
  ],
  webServer: [
    {
      command: 'node ../api/dist/e2e-server.js',
      port: API_PORT,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'development',
        APP_ENV: 'development',
        HANDWRITING_ADAPTER: 'hanzilookup',
        PORT: String(API_PORT),
        HOST: '127.0.0.1',
        SUPABASE_JWT_SECRET: E2E_JWT_SECRET,
        WEB_ORIGINS: `http://localhost:${WEB_PORT}`,
        HANDWRITING_DATA_PATH: '../../packages/adapters/data/mmah.json',
        RATE_LIMIT_PER_MINUTE: '1000',
        // Every browser of every project and worker reaches the API from 127.0.0.1, so the per-IP
        // guard (default 300/min, meant for one real client) is shared by the whole suite, which
        // makes ~300 requests per minute (mostly the /health probe on each page load). Hitting it
        // made tests fail at random (FU-7, issue #6). The guard itself is unit-tested in
        // apps/api (app.test.ts); here it is raised to the schema maximum.
        IP_RATE_LIMIT_PER_MINUTE: '10000',
        MISSING_PROVIDER_MODE: 'mock',
      },
    },
    {
      // Requires a prior `next build` with NEXT_PUBLIC_ENABLE_DEV_TOKEN=true (see docs/SETUP.md).
      command: `pnpm exec next start --port ${WEB_PORT}`,
      port: WEB_PORT,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
