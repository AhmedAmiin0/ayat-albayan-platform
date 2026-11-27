import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { makeRepo, snapshot } from '../../../ci-checks/move-module/fixture.test-util.ts';
import { runApiOne } from '../run.ts';

const API = 'apps/staff-web/src/x/api.ts';
const TEST = 'apps/staff-web/src/x/Page.test.tsx';
const LEFT = 'packages/web-kit/src/y/send.ts';
const FILES: Record<string, string> = {
  [API]:
    "import { apiFetch, apiSend } from '@ab/web-kit';\nexport const a = () => apiFetch('/a');\nexport const b = (body: B) => apiSend('POST', '/b', body);\n",
  [TEST]: `const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (o) => ({ ...(await o<object>()), apiFetch }));
it('x', () => expect(apiFetch).toHaveBeenCalledWith('/a'));
`,
  [LEFT]:
    "import { apiSend } from '../lib/http/api';\nexport const s = (o: Opts) => apiSend('POST', '/s', o.options);\n",
  'apps/api/src/z.ts': "import { apiFetch } from 'x';\napiFetch('/z');\n",
};

function repo(): string {
  const root = makeRepo(FILES);
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  return root;
}

const run = (root: string, argv: string[]): string[] => {
  const out: string[] = [];
  runApiOne(argv, { root, cwd: root, log: (l) => out.push(l), format: () => undefined });
  return out;
};

test('a dry run writes nothing and counts per workspace what it would rewrite and leave', () => {
  const root = repo();
  const out = run(root, []);
  assert.deepEqual(out.slice(0, 3), [
    'workspace\tcalls rewritten\tcalls left\ttests rewritten\ttests left\tfiles excluded',
    'apps/staff-web\t2\t0\t1\t0\t0',
    'packages/web-kit\t0\t1\t0\t0\t0',
  ]);
  assert.match(
    out.at(-1) ?? '',
    /^packages\/web-kit\/src\/y\/send\.ts:2\tcall\tleft\tapiSend: body or/,
  );
  const snap = snapshot(root);
  assert.deepEqual(
    Object.keys(FILES).map((path) => snap[path]),
    Object.values(FILES),
  );
});

test('--write rewrites calls and mocks; a second run changes nothing', () => {
  const root = repo();
  assert.equal(run(root, ['--write']).at(-1), 'api:one: 2 files written');
  const snap = snapshot(root);
  assert.match(snap[API] ?? '', /import \{ call \} from '@ab\/web-kit';/);
  assert.match(snap[API] ?? '', /call\(\{ method: 'POST', path: '\/b', body \}\)/);
  assert.match(snap[TEST] ?? '', /expect\(mockApi\.reads\(\)\)\.toContainEqual/);
  assert.equal(snap['apps/api/src/z.ts'], FILES['apps/api/src/z.ts']);
  assert.equal(run(root, ['--write']).at(-1), 'api:one: 0 files written');
  assert.deepEqual(
    Object.keys(FILES).map((path) => snapshot(root)[path]),
    Object.keys(FILES).map((path) => snap[path]),
  );
});

test('--exclude leaves the listed files and counts them', () => {
  const root = repo();
  writeFileSync(posix.join(root, 'ex.tsv'), `# open lanes\napps/staff-web/src/x\tlane C1\n`);
  const out = run(root, ['--write', '--exclude', 'ex.tsv']);
  assert.equal(out[1], 'apps/staff-web\t0\t0\t0\t0\t2');
  assert.equal(snapshot(root)[API], FILES[API]);
});
