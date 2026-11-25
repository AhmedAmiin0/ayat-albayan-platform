import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { makeRepo, snapshot } from '../../../../ci-checks/move-module/fixture.test-util.ts';
import { runComponents } from '../run.ts';

const DIR = 'apps/family-web/src/x/Card';

const FILES: Record<string, string> = {
  'tsconfig.base.json': '{ "compilerOptions": { "paths": { "@/*": ["${configDir}/src/*"] } } }',
  'apps/family-web/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
  [`${DIR}/Card.tsx`]: `import { useState } from 'react';

const START = 3;
const unit = (n: number): string => \`\${n} kg\`;

export function Card(props: { a: number }) {
  const [n] = useState(START + props.a);
  return <b>{unit(n)}</b>;
}
`,
  [`${DIR}/index.ts`]: "export { Card } from './Card';\n",
  [`${DIR}/Card.test.tsx`]: "import { Card } from './Card';\ntest('x', () => <Card a={1} />);\n",
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

const write = (root: string): string[] => {
  const out: string[] = [];
  const io = { root, cwd: root, log: (l: string) => out.push(l), format: () => undefined };
  runComponents(['--write', '--paths', 'apps/family-web'], io);
  return out;
};

const lastLine = (lines: string[]): string => lines.at(-1) ?? '';

test('--write runs every step once; a second run changes nothing', () => {
  const root = repo();
  assert.match(lastLine(write(root)), /components: 4 files written/);
  const snap = snapshot(root);
  const s = (path: string): string => snap[path] ?? '';
  assert.match(s(`${DIR}/Card.types.ts`), /export interface CardProps \{ a: number \}/);
  assert.match(s(`${DIR}/card.helpers.ts`), /export const unit = /);
  assert.match(
    s(`${DIR}/use-card.ts`),
    /const START = 3;[\s\S]*export function useCard\(props: CardProps\)/,
  );
  assert.match(s(`${DIR}/Card.tsx`), /const \{ n \} = useCard\(props\);/);
  assert.match(lastLine(write(root)), /components: 0 files written/);
});

test('--dry-run writes nothing and reports one row per step', () => {
  const root = repo();
  const out: string[] = [];
  runComponents(['--dry-run', '--paths', 'apps/family-web'], {
    root,
    cwd: root,
    log: (l) => out.push(l),
  });
  assert.deepEqual(
    out.filter((l) => l.startsWith(DIR)).map((l) => l.split('\t').slice(1, 3).join(':')),
    ['types:typed', 'helpers:helpers', 'hook:hooked'],
  );
  assert.equal(snapshot(root)[`${DIR}/Card.tsx`], FILES[`${DIR}/Card.tsx`]);
});
