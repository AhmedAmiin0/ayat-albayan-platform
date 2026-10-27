import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { loadAreas } from './areas.mjs';
import { AREAS } from './fixture.mjs';
import { listFiles } from './graph.mjs';
import { checkMap } from './guard.mjs';

const specs = [
  'chat.spec.ts',
  'payments.spec.ts',
  'translations.spec.ts',
  'layout.spec.ts',
  'detail.spec.ts',
  'db.sql.spec.ts',
];
const files = [
  'apps/web/src/routes/admin/(people)/inbox.tsx',
  'apps/web/src/routes/admin/(finance)/payments.tsx',
  'apps/web/src/routes/admin/translations.tsx',
  'apps/web/src/routes/admin/payments/route.tsx',
  'apps/web/src/routes/admin/payments/$id.tsx',
  'apps/api/src/modules/messaging/inbox/a.ts',
];

test('a complete map passes', () => {
  assert.deepEqual(checkMap(AREAS, specs, files), []);
});

test('a new spec in no area and not developOnly fails', () => {
  assert.match(
    checkMap(AREAS, [...specs, 'new.spec.ts'], files).join('\n'),
    /new\.spec\.ts is in no area/,
  );
});

test('a listed spec that does not exist, a spec listed twice, a path matching nothing all fail', () => {
  const map = structuredClone(AREAS);
  map.developOnly.push('chat.spec.ts', 'gone.spec.ts');
  map.areas.inbox.paths.push('apps/api/src/modules/renamed/');
  const out = checkMap(map, specs, files).join('\n');
  assert.match(out, /chat\.spec\.ts is in an area and in developOnly/);
  assert.match(out, /gone\.spec\.ts is listed but there is no/);
  assert.match(out, /renamed\/ matches no file/);
});

test('the real e2e/areas.json passes', () => {
  const root = fileURLToPath(new URL('../../../../', import.meta.url));
  const real = readdirSync(`${root}e2e/tests`).filter((f) => f.endsWith('.spec.ts'));
  assert.deepEqual(checkMap(loadAreas(root), real, listFiles(root)), []);
});
