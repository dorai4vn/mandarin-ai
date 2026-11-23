// Root config only lints repo scripts; each workspace has its own eslint.config.mjs.
import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['apps/**', 'packages/**', '**/node_modules/**'] },
  js.configs.recommended,
  { languageOptions: { globals: { ...globals.node } } },
];
