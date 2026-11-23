import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { makeRepo, snapshot } from '../../ci-checks/move-module/fixture.test-util.ts';
import { runFold } from './run.ts';

const P = 'apps/web/src/pane';

const FILES: Record<string, string> = {
  'apps/web/tsconfig.json': '{ "compilerOptions": { "paths": { "@/*": ["./src/*"] } } }',
  'apps/web/eslint-suppressions.json':
    '{\n  "src/pane/Pane.tsx": {\n    "max-len": {\n      "count": 1\n    }\n  }\n}\n',
  [`${P}/Pane.tsx`]: "import { w } from './Wide';\nexport const Pane = w;\n",
  [`${P}/Pane.a.test.tsx`]: "import { Pane } from './Pane';\nvi.mock('./Wide');\n",
  [`${P}/Pane.test.tsx`]:
    "import { Pane } from './Pane';\nnew URL('./data.json', import.meta.url);\n",
  [`${P}/Wide.tsx`]: 'export const w = 1;\n',
  [`${P}/data.json`]: '{}',
  'apps/web/src/app.tsx': "import { Pane } from './pane/Pane';\n",
};

const gitRepo = (): string => {
  const root = makeRepo(FILES);
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  return root;
};

const fold = (root: string, argv: string[]): string[] => {
  const out: string[] = [];
  runFold(argv, { root, cwd: root, log: (l) => out.push(l) });
  return out;
};

test('--dry-run prints the summary, each folder and, for --paths, the planned tree', () => {
  const out = fold(gitRepo(), ['--dry-run', '--paths', P]);
  assert.deepEqual(out.slice(1, 3), ['apps/web | 1 | 3 | 1 | 0', 'total | 1 | 3 | 1 | 0']);
  assert.ok(out.includes(`${P}: Pane/ fold 3`));
  assert.ok(out.includes('  Pane.a.test.tsx -> Pane/tests/a.test.tsx'));
});

test('--write moves with git mv and rewrites references, barrels and baseline keys', () => {
  const root = gitRepo();
  fold(root, ['--write', '--paths', P]);
  const s = snapshot(root);
  assert.equal(
    s[`${P}/Pane/Pane.tsx`],
    "import { w } from '@/pane/Wide';\nexport const Pane = w;\n",
  );
  assert.equal(
    s[`${P}/Pane/tests/a.test.tsx`],
    "import { Pane } from '@/pane/Pane/Pane';\nvi.mock('@/pane/Wide');\n",
  );
  assert.equal(
    s[`${P}/Pane/tests/Pane.test.tsx`],
    "import { Pane } from '@/pane/Pane/Pane';\nnew URL('../../data.json', import.meta.url);\n",
  );
  assert.equal(s[`${P}/Pane/index.ts`], "export { Pane } from './Pane';\n");
  assert.equal(s['apps/web/src/app.tsx'], "import { Pane } from './pane/Pane';\n");
  assert.match(s['apps/web/eslint-suppressions.json'] ?? '', /"src\/pane\/Pane\/Pane.tsx"/);
  const status = execFileSync('git', ['status', '--short'], { cwd: root, encoding: 'utf8' });
  assert.match(status, /^RM? apps\/web\/src\/pane\/Pane\.a\.test\.tsx -> .*tests\/a\.test\.tsx$/m);
});
