import assert from 'node:assert/strict';
import { test } from 'node:test';
import { followDomains } from './domains.mjs';

const FILE = 'apps/mobile/eslint.config.js';
const cfg = (list) => `import x from 'y';\nconst DOMAINS = [${list}];\nexport default x(DOMAINS);\n`;
const R = [['apps/mobile/src/sales/a.ts', 'apps/mobile/src/sales/sales/a.ts']];
const follow = (base, head, renames = R) =>
  followDomains(cfg(base), cfg(head), { file: FILE, renames });

test('adding a domain the diff moves files into restores the base line', () => {
  assert.equal(follow('', "'sales'"), cfg(''));
  assert.equal(follow("'finance'", "'finance', 'sales'"), cfg("'finance'"));
});

test('a domain with no rename into it, a dropped domain or other edits stay as they are', () => {
  assert.equal(follow('', "'finance'"), cfg("'finance'"));
  assert.equal(follow("'finance'", "'sales'"), cfg("'sales'"));
  assert.equal(follow('', "'sales'", [['apps/web/src/sales/a.ts', 'apps/web/src/sales/b/a.ts']]), cfg("'sales'"));
  const prefix = [['apps/mobile/src/sales-x/a.ts', 'apps/mobile/src/sales-x/b.ts']];
  assert.equal(follow('', "'sales'", prefix), cfg("'sales'"));
  const head = cfg("'sales'").replace('x(DOMAINS)', 'x([])');
  assert.equal(followDomains(cfg(''), head, { file: FILE, renames: R }), head.replace("'sales'", ''));
  assert.equal(followDomains('a', 'b', { file: FILE, renames: R }), 'b');
});
