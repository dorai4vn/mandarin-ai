#!/usr/bin/env node
// Enforces the package layering from D-010: contracts <- domain <- adapters <- apps/*.
// Fails on (1) dependency cycles, (2) a package depending on an app or on a higher layer,
// (3) source imports of internal packages that are not declared in package.json.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const LAYER = {
  '@mandarin/config': 0,
  '@mandarin/contracts': 1,
  '@mandarin/domain': 2,
  '@mandarin/adapters': 3,
};
const APP_LAYER = 9;

const workspaces = ['packages', 'apps']
  .flatMap((dir) =>
    existsSync(join(root, dir)) ? readdirSync(join(root, dir)).map((d) => join(root, dir, d)) : [],
  )
  .filter((dir) => existsSync(join(dir, 'package.json')));

const pkgs = new Map();
for (const dir of workspaces) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  const internal = Object.keys(deps).filter((d) => d.startsWith('@mandarin/'));
  pkgs.set(pkg.name, {
    dir,
    internal,
    layer: LAYER[pkg.name] ?? APP_LAYER,
    isApp: dir.includes('/apps/'),
  });
}

const errors = [];
for (const [name, p] of pkgs) {
  for (const dep of p.internal) {
    const target = pkgs.get(dep);
    if (!target) errors.push(`${name} depends on unknown internal package ${dep}`);
    else if (target.isApp) errors.push(`${name} must not depend on app ${dep}`);
    else if (!p.isApp && dep !== '@mandarin/config' && target.layer >= p.layer)
      errors.push(`${name} (layer ${p.layer}) must not depend on ${dep} (layer ${target.layer})`);
  }
}

// Cycle detection (DFS).
const state = new Map();
const visit = (name, stack) => {
  if (state.get(name) === 'done') return;
  if (state.get(name) === 'active') return errors.push(`cycle: ${[...stack, name].join(' -> ')}`);
  state.set(name, 'active');
  for (const dep of pkgs.get(name)?.internal ?? []) visit(dep, [...stack, name]);
  state.set(name, 'done');
};
for (const name of pkgs.keys()) visit(name, []);

// Undeclared imports in source files.
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const full = join(dir, f);
    if (['node_modules', 'dist', '.expo', 'ios', 'android'].includes(f)) return [];
    return statSync(full).isDirectory() ? walk(full) : /\.(ts|tsx|mjs|js)$/.test(f) ? [full] : [];
  });
for (const [name, p] of pkgs) {
  for (const file of walk(p.dir)) {
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/from\s+['"](@mandarin\/[a-z-]+)/g)) {
      if (m[1] !== name && !p.internal.includes(m[1]))
        errors.push(`${file}: imports undeclared ${m[1]}`);
    }
  }
}

if (errors.length) {
  console.error(
    `check-deps: ${errors.length} problem(s)\n` + errors.map((e) => ` - ${e}`).join('\n'),
  );
  process.exit(1);
}
console.info(`check-deps: OK (${pkgs.size} workspaces, no cycles, layering respected)`);
