// The web kit's root entry stays out of an app's start chunks only while the kit declares its
// side effects truly: every bare import in its source must match its `sideEffects` list.
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const KIT = fileURLToPath(new URL('../../../../packages/web-kit', import.meta.url));
const TEST = /\.test\.tsx?$|\/tests\//;
const BARE = /^import\s+['"]([^'"]+)['"]/gm;

const sources = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = posix.join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx?$/.test(e.name) && !TEST.test(path) ? [path] : [];
  });

test('the web kit declares only style sheets as side effects', () => {
  const pkg = JSON.parse(readFileSync(posix.join(KIT, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.sideEffects, ['**/*.css']);
});

test('every bare import in the web kit source is a style sheet', () => {
  const bare = sources(posix.join(KIT, 'src')).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(BARE)].map((m) => `${file}: ${m[1]}`),
  );
  assert.ok(bare.length > 0);
  assert.deepEqual(
    bare.filter((line) => !line.endsWith('.css')),
    [],
  );
});
