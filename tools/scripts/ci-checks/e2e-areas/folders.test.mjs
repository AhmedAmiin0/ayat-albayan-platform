// e2e specs and helpers grouped by domain (docs/32 D8, t1–t7): e2e/tests/<domain>/, e2e/support/{core,<domain>}/.
import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { after, test } from 'node:test';
import { listSpecs } from './areas.mjs';
import { AREAS } from './fixture.mjs';
import { makeRepo } from './fixture.mjs';
import { checkMap } from './guard.mjs';
import { plan } from './plan.mjs';
import { selectSpecs } from './select.mjs';

const MAP = { ...AREAS, areas: { ...AREAS.areas, inbox: { ...AREAS.areas.inbox, specs: ['messaging/chat.spec.ts'] } } };
const root = makeRepo({
  'e2e/areas.json': `${JSON.stringify(MAP, null, 2)}\n`,
  'e2e/tests/messaging/chat.spec.ts': "import { open } from '../../support/core/open';\n",
  'e2e/tests/messaging/chat.helper.ts': '\n',
  'e2e/tests/core/auth.setup.ts': '\n',
  'e2e/tests/core/db.setup.ts': '\n',
  'e2e/support/core/open.ts': 'export const open = 1;\n',
  'e2e/support/core/global-setup.ts': '\n',
});
after(() => rmSync(root, { recursive: true, force: true }));
const pick = (...files) => selectSpecs({ root, files, base: 'HEAD' });

test('listSpecs finds specs in sub-folders, relative to e2e/tests/', () => {
  const specs = listSpecs(root);
  assert.ok(specs.includes('messaging/chat.spec.ts'));
  assert.ok(specs.includes('chat.spec.ts'));
  assert.ok(!specs.some((s) => s.endsWith('.helper.ts') || s.endsWith('.setup.ts')));
});

test('the guard maps a spec in a folder like a flat one', () => {
  const specs = ['messaging/chat.spec.ts', 'payments.spec.ts', 'translations.spec.ts', 'layout.spec.ts', 'detail.spec.ts', 'db.sql.spec.ts'];
  const files = Object.values(MAP.areas).flatMap((a) => a.paths.map((p) => (p.endsWith('/') ? `${p}a.ts` : p)));
  assert.deepEqual(checkMap(MAP, specs, files), []);
  assert.match(checkMap(MAP, [...specs, 'messaging/new.spec.ts'], files).join(), /messaging\/new\.spec\.ts is in no area/);
});

test('a changed spec in a folder runs itself; a helper in a folder runs everything, as a flat one does', () => {
  assert.deepEqual(pick('e2e/tests/messaging/chat.spec.ts').specs, ['messaging/chat.spec.ts']);
  assert.equal(pick('e2e/support/core/open.ts').full, true);
});

test('global-setup and *.setup in a folder still run the full suite', () => {
  assert.equal(pick('e2e/support/core/global-setup.ts').full, true);
  assert.equal(pick('e2e/tests/core/auth.setup.ts').full, true);
  assert.equal(pick('e2e/tests/core/db.setup.ts').full, true, 'every *.setup.ts, as playwright testMatch');
});

test('the plan accepts specs in folders and rejects path tricks (full matrix)', () => {
  const p = plan({ full: false, specs: ['messaging/chat.spec.ts'] }, { 'tests/messaging/chat.spec.ts': { desktop: 10_000 } });
  assert.equal(p.specs, 'tests/messaging/chat.spec.ts');
  assert.equal(p.matrix.include.length, 2);
  for (const bad of ['../x.spec.ts', 'a/../../x.spec.ts', '/abs.spec.ts']) {
    assert.equal(plan({ full: false, specs: [bad] }, {}).specs, '', bad);
  }
});
