import assert from 'node:assert/strict';
import { test } from 'node:test';
import { suppressionsMoved } from './baselines.mjs';

// docs/32 c12a–e: moving a deep-import target into mobile `core/` ends those deep imports, so the
// importers' ab/module-boundaries entries shrink in the same move PR.
const RULE = 'ab/module-boundaries';
const PARENT = 'ab/no-parent-imports';
const FILE = 'apps/mobile/eslint-suppressions.json';
const MOVES = [['apps/mobile/src/more/Note.tsx', 'apps/mobile/src/core/ui/feedback/Note.tsx']];
const base = {
  'src/more/Note.tsx': { 'max-len': { count: 1 } },
  'src/inbox/a.tsx': { [RULE]: { count: 3 }, [PARENT]: { count: 2 }, 'max-len': { count: 1 } },
  'src/sales/b.tsx': { [RULE]: { count: 1 } },
};
const check = (head) => suppressionsMoved(FILE, { base: JSON.stringify(base), head: JSON.stringify(head) }, MOVES);
const note = { 'src/core/ui/feedback/Note.tsx': { 'max-len': { count: 1 } } };

test('a move may lower or drop module-boundaries entries, alongside no-parent-imports', () => {
  const inbox = { [RULE]: { count: 1 }, [PARENT]: { count: 2 }, 'max-len': { count: 1 } };
  assert.equal(check({ ...note, 'src/inbox/a.tsx': inbox, 'src/sales/b.tsx': { [RULE]: { count: 1 } } }), true);
  assert.equal(check({ ...note, 'src/inbox/a.tsx': { 'max-len': { count: 1 } } }), true, 'both rules and a file go');
});

test('module-boundaries may not rise, appear or reach 0, and other rules stay', () => {
  const inbox = base['src/inbox/a.tsx'];
  const rest = { ...note, 'src/inbox/a.tsx': inbox };
  assert.equal(check({ ...rest, 'src/sales/b.tsx': { [RULE]: { count: 2 } } }), false, 'raised');
  assert.equal(check({ ...rest, 'src/sales/b.tsx': { [RULE]: { count: 1 } }, 'src/c.tsx': { [RULE]: { count: 1 } } }), false, 'added');
  assert.equal(check({ ...rest, 'src/sales/b.tsx': { [RULE]: { count: 0 } } }), false, 'count 0');
  const noMaxLen = { [RULE]: { count: 3 }, [PARENT]: { count: 2 } };
  assert.equal(check({ ...note, 'src/inbox/a.tsx': noMaxLen, 'src/sales/b.tsx': base['src/sales/b.tsx'] }), false, 'max-len dropped');
});
