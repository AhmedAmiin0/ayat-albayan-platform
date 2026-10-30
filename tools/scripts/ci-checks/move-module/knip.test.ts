import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeRepo, map, snapshot } from './fixture.test-util.ts';
import { rewriteKnipWorkspaces } from './knip.ts';
import { runMap } from './run.ts';

const KNIP = `{
  "workspaces": {
    ".": { "entry": ["tools/x.mjs"] },
    "apps/api": {
      "entry": ["src/main.ts", "src/scripts/*.ts"],
      "ignore": ["src/{a,b}/index.ts"]
    },
    "apps/web": { "entry": ["src/main.ts"] }
  }
}
`;

test('a move inside a workspace rewrites only that workspace block, format kept', () => {
  const out = rewriteKnipWorkspaces(KNIP, [['apps/api/src/main.ts', 'apps/api/src/app/main.ts']]);
  assert.equal(out, KNIP.replace('"src/main.ts", "src/scripts', '"src/app/main.ts", "src/scripts'));
});

test('a move across workspaces or of an unlisted file changes nothing', () => {
  assert.equal(rewriteKnipWorkspaces(KNIP, [['apps/api/src/main.ts', 'packages/x/src/main.ts']]), KNIP);
  assert.equal(rewriteKnipWorkspaces(KNIP, [['apps/api/src/other.ts', 'apps/api/src/o.ts']]), KNIP);
  assert.equal(rewriteKnipWorkspaces('{ "entry": ["src/main.ts"] }', [['apps/api/src/main.ts', 'apps/api/b.ts']]), '{ "entry": ["src/main.ts"] }');
});

test('two workspaces rewritten in one pass; the root workspace follows repo paths', () => {
  const root = makeRepo({
    'knip.json': KNIP,
    'tools/x.mjs': '',
    'apps/api/src/main.ts': '',
    'apps/web/src/main.ts': '',
    'refactor/moves/k.json': map({
      moves: [
        { from: 'tools/x.mjs', to: 'tools/y/x.mjs' },
        { from: 'apps/api/src/main.ts', to: 'apps/api/src/boot/' },
        { from: 'apps/web/src/main.ts', to: 'apps/web/src/app/main.ts' },
      ],
    }),
  });
  runMap(root, 'refactor/moves/k.json');
  const want = KNIP.replace('tools/x.mjs', 'tools/y/x.mjs')
    .replace('"src/main.ts", "src/scripts', '"src/boot/main.ts", "src/scripts')
    .replace('"entry": ["src/main.ts"] }', '"entry": ["src/app/main.ts"] }');
  assert.equal(snapshot(root)['knip.json'], want);
});
