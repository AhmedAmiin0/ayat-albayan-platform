import assert from 'node:assert/strict';
import { test } from 'node:test';
import { tree } from '../../apply/tests/fixture.ts';
import { runGate } from '../gate.ts';

const map = {
  base: 'x',
  domains: [{ domain: 'sales', groups: [], features: ['leads'] }],
  moves: [],
  drops: [],
  splits: [],
  renames: [],
};

function gate(files: Record<string, string>, layers: ('api' | 'staff-web')[]) {
  const root = tree(files);
  const lines: string[] = [];
  const code = runGate(
    { root, files: Object.keys(files), log: (l) => lines.push(l) },
    { map, layers },
  );
  return { code, lines };
}

test('a tree that follows the list passes', () => {
  const out = gate({ 'apps/staff-web/src/features/sales/leads/index.ts': '' }, ['staff-web']);
  assert.equal(out.code, 0);
  assert.deepEqual(out.lines, ['structure: 0 problems in 1 layers']);
});

test('each problem is one line with its layer', () => {
  const out = gate(
    {
      'apps/staff-web/src/features/sales/lead/index.ts': '',
      'apps/api/src/modules/sales/leads/index.ts': '',
      'apps/api/src/modules/sales/leads/leads.controller.ts': '',
    },
    ['staff-web', 'api'],
  );
  assert.equal(out.code, 1);
  assert.deepEqual(out.lines, [
    '  staff-web: not a listed name: apps/staff-web/src/features/sales/lead (closest: leads)',
    '  api: feature controller without a Nest module: apps/api/src/modules/sales/leads',
    'structure: 2 problems in 2 layers',
  ]);
});

test('layers that are not asked for are not checked', () => {
  const out = gate({ 'apps/api/src/modules/nope/x/index.ts': '' }, ['staff-web']);
  assert.equal(out.code, 0);
});
