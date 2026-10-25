import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renamedLiteral, sameButRenames, substitutions } from './pure-move-tokens.mjs';

const subs = substitutions([
  ['apps/api/src/env.kapso.ts', 'apps/api/src/config/env/whatsapp/env.kapso.ts'],
  ['apps/api/src/modules/teachers/http.ts', 'apps/api/src/common/http/http.ts'],
  ['apps/api/src/modules/whatsapp/kapso.ts', 'apps/api/src/modules/messaging/whatsapp/kapso.ts'],
]);

test('a path literal may follow its file, relative to any base', () => {
  assert.equal(renamedLiteral("'env.kapso.ts'", "'config/env/whatsapp/env.kapso.ts'", subs), true);
  assert.equal(renamedLiteral('`env.kapso.ts: ${HOST}`', '`config/env/whatsapp/env.kapso.ts: ${HOST}`', subs), true);
  assert.equal(renamedLiteral('/^modules\\/teachers\\/http$/', '/^common\\/http\\/http$/', subs), true);
  assert.equal(renamedLiteral("'modules/whatsapp'", "'modules/messaging/whatsapp'", subs), true, 'a folder fragment');
});

test('other literal changes do not pass', () => {
  assert.equal(renamedLiteral("'env.kapso.ts'", "'config/env/env.kapso.ts'", subs), false);
  assert.equal(renamedLiteral("'/admin/students'", "'/admin/pupils'", subs), false);
  assert.equal(renamedLiteral("'validation_failed'", "'validation_error'", subs), false);
});

test('the code around the literals must be identical', () => {
  assert.equal(sameButRenames("const a = new Set(['env.kapso.ts']);", "const a = new Set(['config/env/whatsapp/env.kapso.ts']);", subs), true);
  assert.equal(sameButRenames("const a = new Set(['env.kapso.ts']);", "const a = new Set(['config/env/whatsapp/env.kapso.ts', 'x']);", subs), false);
  assert.equal(sameButRenames("f('env.kapso.ts');", "g('config/env/whatsapp/env.kapso.ts');", subs), false);
});
