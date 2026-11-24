import { defineConfig } from 'vitest/config';

// Unit tests for pure/browser-API logic (IndexedDB via fake-indexeddb). E2E lives in e2e/ (Playwright).
export default defineConfig({
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
