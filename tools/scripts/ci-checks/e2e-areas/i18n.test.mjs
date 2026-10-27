import assert from 'node:assert/strict';
import { rmSync } from 'node:fs';
import { after, test } from 'node:test';
import { makeRepo, write } from './fixture.mjs';
import { changedKeys, keyPattern, keyUsers } from './i18n.mjs';
import { selectSpecs } from './select.mjs';

const BUNDLE = 'packages/shared/i18n/ar.json';
const root = makeRepo();
after(() => rmSync(root, { recursive: true, force: true }));
const withBundle = (tree) => {
  write(root, BUNDLE, JSON.stringify(tree));
  return selectSpecs({ root, files: [BUNDLE], base: 'HEAD' });
};
const base = { inbox: { title: 'المحادثات' }, pay: { title: 'المدفوعات' }, orphan: { x: 'س' } };

test('changedKeys: added, removed and changed leaves', () => {
  assert.deepEqual(
    changedKeys({ a: { b: '1', c: '2' }, d: '3' }, { a: { b: '1', c: '9' }, e: '4' }),
    ['a.c', 'd', 'e'],
  );
});

test('keyPattern: full paths, quoted keys, template prefixes and parents taken whole', () => {
  const re = keyPattern('inbox.lead.status');
  for (const hit of [
    't.inbox.lead.status',
    "'inbox.lead.status'",
    'const L = t.inbox.lead;',
    'f(t.inbox)',
    '`inbox.lead.${s}`',
    't.inbox.lead[k]',
  ])
    assert.match(hit, re, hit);
  for (const miss of ['t.inbox.title', 'counts.inbox = 1', 't.inbox.leader', 'inbox.lead.statusX'])
    assert.doesNotMatch(miss, re, miss);
});

test('keyUsers: unknown keys and ignored readers', () => {
  const src = new Map([
    ['web/a.ts', 't.inbox.title'],
    ['apps/mobile/b.ts', 't.pay.title'],
  ]);
  const r = keyUsers(['inbox.title', 'pay.title', 'gone.key'], src, (f) =>
    f.startsWith('apps/mobile/'),
  );
  assert.deepEqual([...r.users], ['web/a.ts']);
  assert.deepEqual(r.unknown, ['gone.key']);
});

test('a changed string runs the pages that read it, plus the translations area', () => {
  assert.deepEqual(withBundle({ ...base, inbox: { title: 'الرسائل' } }).specs, [
    'chat.spec.ts',
    'translations.spec.ts',
  ]);
});

test('a string nobody is found to read runs everything', () => {
  const r = withBundle({ ...base, orphan: { x: 'ص' } });
  assert.equal(r.full, true);
  assert.match(r.reason, /orphan\.x/);
});

test('a bundle change without a base commit runs everything', () => {
  write(root, BUNDLE, JSON.stringify(base));
  assert.equal(selectSpecs({ root, files: [BUNDLE] }).full, true);
});
