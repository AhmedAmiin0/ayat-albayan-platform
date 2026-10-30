// pure-move-check with identifier renames (docs/32 D2) and the config holes (critic correction 5).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classify } from '../pure-move-check.mjs';
import { renameTable } from '../pure-move-paths.mjs';
import { identifierTable } from './identifiers.mjs';

const FROM = 'apps/api/src/m/payouts.queries.ts';
const TO = 'apps/api/src/m/payouts.repo.ts';
const ids = identifierTable([{ status: 'A', from: 'refactor/moves/r.json', to: 'refactor/moves/r.json' }], () => JSON.stringify({ renames: { PayoutsRepo: 'PayoutsRepo' } }));
const ctx = { renames: [[FROM, TO]], table: renameTable([[FROM, TO]]), ids };
const reader = (files) => (side, f) => files[`${side}:${f}`] ?? '';

test('a listed identifier rename passes; strings, other names and logic still fail', () => {
  const base = "export class PayoutsQueries {\n  name = 'PayoutsQueries';\n}\n";
  const ok = { [`base:${FROM}`]: base, [`head:${TO}`]: base.replace('class PayoutsQueries', 'class PayoutsRepo') };
  const entry = { status: 'R080', from: FROM, to: TO };
  assert.equal(classify(entry, reader(ok), ctx).kind, 'paths');
  assert.equal(classify(entry, reader(ok), { ...ctx, ids: new Map() }).kind, 'bad', 'not listed in a map');
  const str = { ...ok, [`head:${TO}`]: base.replaceAll('PayoutsQueries', 'PayoutsRepo') };
  assert.equal(classify(entry, reader(str), ctx).kind, 'bad', 'a string changed');
  const logic = { ...ok, [`head:${TO}`]: `${ok[`head:${TO}`]}export const x = 1;\n` };
  assert.equal(classify(entry, reader(logic), ctx).kind, 'bad');
});

test('an importer and a code config follow the rename; a knip guard name follows it too', () => {
  const imp = "import { PayoutsQueries } from './payouts.queries';\nexport const p = new PayoutsQueries();\n";
  const files = {
    'base:apps/api/src/m/x.ts': imp,
    'head:apps/api/src/m/x.ts': imp.replaceAll('PayoutsQueries', 'PayoutsRepo').replace('payouts.queries', 'payouts.repo'),
    'base:apps/api/vitest.config.ts': "export default { setupFiles: ['./src/m/payouts.queries.ts'] };\n",
    'head:apps/api/vitest.config.ts': "export default { setupFiles: ['./src/m/payouts.repo.ts'], pool: 'x' };\n",
    'base:refactor/guards/knip.json': JSON.stringify([`${FROM} exports PayoutsQueries`]),
    'head:refactor/guards/knip.json': JSON.stringify([`${TO} exports PayoutsRepo`]),
  };
  const m = (file) => classify({ status: 'M', from: file, to: file }, reader(files), ctx).kind;
  assert.equal(m('apps/api/src/m/x.ts'), 'paths');
  assert.equal(m('apps/api/vitest.config.ts'), 'bad', 'a code config may only change paths');
  assert.equal(m('refactor/guards/knip.json'), 'paths');
});
