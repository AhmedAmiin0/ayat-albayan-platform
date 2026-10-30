// ci.yml «changes»: only a plain folder move (move-e2e.mjs) with a green pure-move-check skips e2e (docs/32 g1).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { moveVerdict } from './move-e2e.mjs';

const ci = parse(readFileSync(fileURLToPath(new URL('../../../../.github/workflows/ci.yml', import.meta.url)), 'utf8'));
const job = ci.jobs.changes;
const step = job.steps.find((s) => s.id === 'move');

const MAP = { status: 'A', from: 'refactor/moves/a1.json', to: 'refactor/moves/a1.json' };
const mv = (from, to) => ({ status: 'R100', from, to });
const FOLDER = mv('apps/web/src/features/inbox/a.ts', 'apps/web/src/features/messaging/inbox/a.ts');
const IMPORTER = { status: 'M', from: 'apps/web/src/features/x.ts', to: 'apps/web/src/features/x.ts' };
const verdict = (entries, map = {}) => moveVerdict(entries, () => JSON.stringify({ id: 'a1', seq: 1, moves: [], ...map }));

test('ci: the step runs move-e2e then pure-move-check, and only its «false» wins over the diff', () => {
  assert.equal(step.if, "github.event_name == 'pull_request' && steps.diff.outputs.e2e == 'true'");
  assert.match(step.run, /git diff --name-status -M50% "origin\/\$BASE_REF\.\.\.HEAD" \| node tools\/scripts\/ci-checks\/pure-move\/move-e2e\.mjs/);
  assert.match(step.run, /&& node tools\/scripts\/ci-checks\/pure-move-check\.mjs "origin\/\$BASE_REF" HEAD; then/);
  assert.equal(job.outputs.e2e, '${{ steps.move.outputs.e2e || steps.diff.outputs.e2e }}');
  assert.match(job.steps.find((s) => s.id === 'e2e').if, /steps\.move\.outputs\.e2e != 'false'/);
});

test('plain folder moves with a map may skip e2e', () => {
  assert.deepEqual(verdict([MAP, FOLDER, IMPORTER]), { skip: true, reason: 'plain folder moves' });
  assert.equal(verdict([MAP, FOLDER], { renames: {} }).skip, true);
});

test('no map, identifier renames or a malformed renames keep e2e', () => {
  assert.equal(verdict([FOLDER]).skip, false);
  assert.match(verdict([MAP, FOLDER], { renames: { WidgetQueries: 'WidgetRepo' } }).reason, /1 identifier rename/);
  assert.equal(verdict([MAP, FOLDER], { renames: 'x' }).skip, false);
  assert.throws(() => moveVerdict([MAP], () => '{'));
});

test('a file-name change, a route move or anything e2e reads at start-up keeps e2e', () => {
  assert.match(verdict([MAP, mv('apps/web/src/students.ts', 'apps/web/src/pupils.ts')]).reason, /changes its name/);
  assert.match(verdict([MAP, mv('apps/web/src/routes/admin/a.tsx', 'apps/web/src/routes/admin/x/a.tsx')]).reason, /route/);
  for (const f of ['e2e/playwright.config.ts', 'e2e/support/core/global-setup.ts', 'apps/web/vite.config.ts', 'apps/api/tsconfig.json', '.github/workflows/ci.yml', 'apps/web/src/routeTree.gen.ts']) {
    assert.match(verdict([MAP, FOLDER, { status: 'M', from: f, to: f }]).reason, /read when e2e starts/, f);
  }
});
