// ci «changes» runs select.mjs and plan.mjs with no `pnpm i` (only setup-node): they and every
// file they import may use node built-ins and siblings only, or the selection fails (full e2e).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const importsOf = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);

test('select.mjs and plan.mjs import node built-ins and relative files only', () => {
  const seen = new Set();
  const queue = ['select.mjs', 'plan.mjs'].map((f) => join(here, f));
  for (let file = queue.shift(); file; file = queue.shift()) {
    if (seen.has(file)) continue;
    seen.add(file);
    const specs = importsOf(file);
    for (const spec of specs) assert.match(spec, /^(node:|\.\.?\/)/, `${file}: ${spec}`);
    queue.push(...specs.filter((s) => s.startsWith('.')).map((s) => join(dirname(file), s)));
  }
  assert.ok(seen.size >= 5, [...seen].join());
});
