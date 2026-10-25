import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rebasedLiteral, renamedLiteral, sameButRenames, substitutions } from './pure-move-tokens.mjs';

const subs = substitutions([
  ['apps/api/src/env.kapso.ts', 'apps/api/src/config/env/whatsapp/env.kapso.ts'],
  ['apps/api/src/modules/teachers/http.ts', 'apps/api/src/common/http/http.ts'],
  ['apps/api/src/modules/whatsapp/kapso.ts', 'apps/api/src/modules/messaging/whatsapp/kapso.ts'],
], (dir) => dir === 'apps/api/src/modules/whatsapp');

test('a path literal may follow its file, relative to any base', () => {
  assert.equal(renamedLiteral("'env.kapso.ts'", "'config/env/whatsapp/env.kapso.ts'", subs), true);
  assert.equal(renamedLiteral('`env.kapso.ts: ${HOST}`', '`config/env/whatsapp/env.kapso.ts: ${HOST}`', subs), true);
  assert.equal(renamedLiteral('/^modules\\/teachers\\/http$/', '/^common\\/http\\/http$/', subs), true);
  assert.equal(renamedLiteral("'modules/whatsapp'", "'modules/messaging/whatsapp'", subs), true, 'a folder fragment');
  assert.equal(renamedLiteral("'modules\\\\whatsapp\\\\kapso.ts'", "'modules\\\\messaging\\\\whatsapp\\\\kapso.ts'", subs), true, 'Windows separators');
});

test('other literal changes do not pass', () => {
  assert.equal(renamedLiteral("'env.kapso.ts'", "'config/env/env.kapso.ts'", subs), false);
  assert.equal(renamedLiteral("'/admin/students'", "'/admin/pupils'", subs), false);
  assert.equal(renamedLiteral("'validation_failed'", "'validation_error'", subs), false);
  assert.equal(renamedLiteral("'modules/teachers/teachers.service'", "'common/http/teachers.service'", subs), false, 'teachers/ did not move');
  assert.equal(renamedLiteral("'src/x.ts'", "'src/config/env/x.ts'", subs), false);
});

test('the code around the literals must be identical', () => {
  assert.equal(sameButRenames("const a = new Set(['env.kapso.ts']);", "const a = new Set(['config/env/whatsapp/env.kapso.ts']);", subs), true);
  assert.equal(sameButRenames("const a = new Set(['env.kapso.ts']);", "const a = new Set(['config/env/whatsapp/env.kapso.ts', 'x']);", subs), false);
  assert.equal(sameButRenames("f('env.kapso.ts');", "g('config/env/whatsapp/env.kapso.ts');", subs), false);
});

test('template literals with ${…} and quotes inside stay one literal', () => {
  const a = "const s = `const base = 'https://${HOST}/x';`;\nf([`env.kapso.ts: ${HOST}`]);";
  const b = "const s = `const base = 'https://${HOST}/x';`;\nf([`config/env/whatsapp/env.kapso.ts: ${HOST}`]);";
  assert.equal(sameButRenames(a, b, subs), true);
  assert.equal(sameButRenames(a, b.replace('/x', '/y'), subs), false);
});

test('a relative literal may be re-based so it names the same place from the moved file', () => {
  const move = { subs, from: 'apps/mobile/src/push/a.test.ts', to: 'apps/mobile/src/core/push/a.test.ts' };
  assert.equal(rebasedLiteral("'../../app'", "'../../../app'", move), true);
  assert.equal(rebasedLiteral('`../../app/(${tree}-chat)`', '`../../../app/(${tree}-chat)`', move), true);
  assert.equal(rebasedLiteral("'../../app'", "'../../../src'", move), false, 'another place');
  assert.equal(rebasedLiteral("'../../app'", "'../../app'", move), false, 'unchanged text now names another place');
  assert.equal(rebasedLiteral("'../x'", "'../../x'", { subs, from: 'a/b.ts', to: 'a/b.ts' }), false, 'the file did not move');
  assert.equal(rebasedLiteral("'app'", "'../app'", move), false, 'not relative');
  const code = "const roots = ['../../app', `../../app/(${tree}-chat)`];";
  const moved = "const roots = ['../../../app', `../../../app/(${tree}-chat)`];";
  assert.equal(sameButRenames(code, moved, move), true);
  assert.equal(sameButRenames(code, moved, subs), false, 'needs the file move');
});
