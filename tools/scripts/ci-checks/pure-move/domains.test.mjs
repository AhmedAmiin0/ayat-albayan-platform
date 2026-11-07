import assert from 'node:assert/strict';
import { test } from 'node:test';
import { followDomains } from './domains.mjs';

const FILE = 'apps/mobile/eslint.config.js';
const cfg = (list) => `import x from 'y';\nconst DOMAINS = [${list}];\nexport default x(DOMAINS);\n`;
const R = [['apps/mobile/src/sales/a.ts', 'apps/mobile/src/sales/sales/a.ts']];
const follow = (base, head, renames = R) =>
  followDomains(cfg(base), cfg(head), { file: FILE, renames });
const stays = (base, head, renames = R) => assert.equal(follow(base, head, renames), cfg(head));

test('adding a domain the diff regroups files into restores the base line', () => {
  assert.equal(follow('', "'sales'"), cfg(''));
  assert.equal(follow("'finance'", "'finance', 'sales'"), cfg("'finance'"));
  const fromFlat = [['apps/mobile/src/sales-app/a.ts', 'apps/mobile/src/sales/app/a.ts']];
  assert.equal(follow('', "'sales'", fromFlat), cfg(''));
});

test('a domain with no regroup into it or a dropped domain stays as it is', () => {
  stays('', "'finance'");
  stays("'finance'", "'sales'");
  stays('', "'sales'", [['apps/web/src/sales/a.ts', 'apps/web/src/sales/b/a.ts']]);
  stays('', "'sales'", [['apps/mobile/src/sales-x/a.ts', 'apps/mobile/src/sales-x/b.ts']]);
  stays('', "'auth'", [['apps/mobile/src/auth/b/a.ts', 'apps/mobile/src/auth/b/c/a.ts']]);
  stays('', "'auth'", [['apps/mobile/src/x/a.ts', 'apps/mobile/src/auth/a.ts']]);
});

test('anything but plain quoted names on the line stays as it is', () => {
  for (const extra of ['"auth"', '`auth`', '...evil()', 'process.env.X']) stays('', `'sales', ${extra}`);
  stays('', "'sales',");
});

test('the lint blocks (docs/31b) follow too', () => {
  const blocks = 'apps/mobile/lint.blocks.mjs';
  assert.equal(followDomains(cfg(''), cfg("'sales'"), { file: blocks, renames: R }), cfg(''));
});

test('only eslint configs; other edits in the file still show', () => {
  const metro = 'apps/mobile/metro.config.js';
  assert.equal(followDomains(cfg(''), cfg("'sales'"), { file: metro, renames: R }), cfg("'sales'"));
  const head = cfg("'sales'").replace('x(DOMAINS)', 'x([])');
  assert.equal(followDomains(cfg(''), head, { file: FILE, renames: R }), head.replace("'sales'", ''));
  assert.equal(followDomains('a', 'b', { file: FILE, renames: R }), 'b');
});
