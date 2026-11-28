import assert from 'node:assert/strict';
import { test } from 'node:test';
import { editBoundaries, groupAlternation, routeGroup } from '../boundaries.ts';

const domains = [
  { domain: 'sales', groups: [], features: ['leads'] },
  { domain: 'messaging', groups: ['notifications'], features: ['inbox', 'notifications/bell'] },
];

test('groups make their own module level', () => {
  assert.equal(groupAlternation(domains), 'messaging/notifications');
  const module = new RegExp(
    `^(src/features/(?:${groupAlternation(domains)})/[^/]+|src/features/[^/]+/[^/]+)/`,
  );
  assert.equal(
    'src/features/messaging/notifications/bell/x.ts'.match(module)?.[1],
    'src/features/messaging/notifications/bell',
  );
  assert.equal('src/features/sales/leads/x.ts'.match(module)?.[1], 'src/features/sales/leads');
});

test('route files may import a feature index, never its internals', () => {
  const text = routeGroup(domains);
  assert.match(text, /'!@\/features\/\*\/\*'/);
  assert.match(
    text,
    /'!@\/features\/messaging\/notifications\/\*',\n {4}'@\/features\/messaging\/notifications\/\*\/\*\*'/,
  );
});

test('edits fill the placeholders and report text that is gone', () => {
  const edits: [string, string][] = [
    ["module: 'a'", "module: 'src/(?:{G})/[^/]+|src/(?:{D})/[^/]+'"],
    ['gone', 'x'],
  ];
  const out = editBoundaries("const b = { module: 'a' };", edits, domains);
  assert.equal(
    out.text,
    "const b = { module: 'src/(?:messaging/notifications)/[^/]+|src/(?:sales|messaging)/[^/]+' };",
  );
  assert.deepEqual(out.missing, ['gone']);
});
