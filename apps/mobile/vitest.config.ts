import { defineConfig } from 'vitest/config';

// Only pure TypeScript under src/lib is unit-tested here (no React Native runtime).
export default defineConfig({ test: { include: ['src/lib/**/*.test.ts'] } });
