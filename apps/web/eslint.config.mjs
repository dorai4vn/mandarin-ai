import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // UI-2B (M3): new UI code must use the V2 primitives. The legacy '@/components/ui' entry keeps
    // the M0 API (there `Button variant="ghost"` = outlined) for existing screens only.
    files: ['src/components/ui/**/*.{ts,tsx}', 'app/lab/design/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/components/ui',
              message: "Import V2 primitives from '@/components/ui/index' (legacy M0 API).",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**', 'public/**'],
  },
];

export default config;
