import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { makeRepo, snapshot } from '../../../../ci-checks/move-module/fixture.test-util.ts';
import { runComponents } from '../run.ts';

const MONEY = 'apps/staff-web/src/money';
const DIR = `${MONEY}/MyPaymentAmount`;

const FILES: Record<string, string> = {
  'tsconfig.base.json': '{ "compilerOptions": { "paths": { "@/*": ["${configDir}/src/*"] } } }',
  'apps/staff-web/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
  [`${MONEY}/api.ts`]: 'export const update = (n: number) => n;\n',
  [`${MONEY}/use-my-payment-amount.ts`]: `import { useState } from 'react';
import { update } from './api';

export function useMyPaymentAmount(n: number) {
  const [v] = useState(update(n));
  return v;
}
`,
  [`${DIR}/MyPaymentAmount.tsx`]: `import { useMyPaymentAmount } from '@/money/use-my-payment-amount';

export function MyPaymentAmount({ n }: { n: number }) {
  const v = useMyPaymentAmount(n);
  return <b>{v}</b>;
}
`,
  [`${DIR}/index.ts`]: "export { MyPaymentAmount } from './MyPaymentAmount';\n",
  [`${DIR}/MyPaymentAmount.test.tsx`]:
    "import { MyPaymentAmount } from './MyPaymentAmount';\ntest('x', () => <MyPaymentAmount n={1} />);\n",
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

const write = (root: string): string => {
  const out: string[] = [];
  const io = { root, cwd: root, log: (l: string) => out.push(l), format: () => undefined };
  runComponents(['--write', '--step', 'adopt', '--paths', 'apps/staff-web'], io);
  return out.at(-1) ?? '';
};

test('--step adopt moves a same-name hook into the folder and deletes the old file', () => {
  const root = repo();
  assert.match(write(root), /components: 2 files written, 1 removed/);
  const snap = snapshot(root);
  assert.equal(snap[`${MONEY}/use-my-payment-amount.ts`], undefined);
  assert.match(snap[`${DIR}/use-my-payment-amount.ts`] ?? '', /from '@\/money\/api'/);
  assert.match(snap[`${DIR}/MyPaymentAmount.tsx`] ?? '', /from '\.\/use-my-payment-amount'/);
  const staged = execFileSync('git', ['diff', '--cached', '--name-status'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.match(staged, /^R\d+\tapps\/staff-web\/src\/money\/use-my-payment-amount\.ts\t/m);
  assert.match(write(root), /components: 0 files written, 0 removed/);
});
