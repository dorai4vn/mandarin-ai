#!/usr/bin/env node
// Offline equivalent of `expo install --check`: every dependency of apps/mobile that the
// installed Expo SDK pins in bundledNativeModules.json must satisfy that range (D-014).
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const mobileDir = new URL('../apps/mobile/', import.meta.url).pathname;
const require = createRequire(mobileDir);
const pkg = JSON.parse(readFileSync(`${mobileDir}package.json`, 'utf8'));
const bundled = require('expo/bundledNativeModules.json');
const semver = require('semver');
const expoVersion = require('expo/package.json').version;

const problems = [];
let checked = 0;
for (const [name, declared] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
  const expected = bundled[name];
  if (!expected) continue;
  checked += 1;
  const installed = require(`${name}/package.json`).version;
  if (!semver.satisfies(installed, expected))
    problems.push(
      `${name}: installed ${installed}, SDK expects ${expected} (declared ${declared})`,
    );
}
if (problems.length) {
  console.error(
    `check-expo-versions (expo ${expoVersion}):\n` + problems.map((p) => ` - ${p}`).join('\n'),
  );
  process.exit(1);
}
console.info(
  `check-expo-versions: OK — ${checked} packages match Expo SDK ${expoVersion} bundledNativeModules`,
);
