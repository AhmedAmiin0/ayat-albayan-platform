import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { makeRepo, snapshot } from '../../../../ci-checks/move-module/fixture.test-util.ts';
import { runFold } from '../run.ts';

const KIT = 'packages/web-kit/src/ui';

const FILES: Record<string, string> = {
  'tsconfig.base.json': '{ "compilerOptions": { "paths": { "@/*": ["${configDir}/src/*"] } } }',
  'packages/web-kit/tsconfig.json': '{ "extends": "../../tsconfig.base.json" }',
  'packages/web-kit/package.json': JSON.stringify({
    name: '@ab/web-kit',
    exports: { '.': './src/index.ts', './*': { default: './src/*' } },
  }),
  [`${KIT}/button.tsx`]: 'export function Button() {\n  return <button />;\n}\n',
  [`${KIT}/button.test.tsx`]: "import { Button } from './button';\nvi.mock('./button');\n",
  [`${KIT}/sizes.ts`]: 'export const sizes = 1;\n',
  [`${KIT}/chat-icons.tsx`]: 'export function SendIcon() {\n  return <svg />;\n}\n',
  [`${KIT}/form.tsx`]:
    "import { Button } from './button';\nexport const Form = () => <Button />;\n",
};

function folded(argv: string[]): Record<string, string> {
  const root = makeRepo(FILES);
  const git = (...args: string[]): string =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'base');
  runFold(argv, { root, cwd: root, log: () => undefined });
  return snapshot(root);
}

test('--components folds each component file alone, kebab-case with a case rename', () => {
  const s = folded(['--write', '--components', '--paths', KIT]);
  assert.equal(s[`${KIT}/Button/Button.tsx`], FILES[`${KIT}/button.tsx`]);
  assert.equal(s[`${KIT}/Button/index.ts`], "export { Button } from './Button';\n");
  assert.match(s[`${KIT}/Button/Button.test.tsx`] ?? '', /vi\.mock\('.\/Button'\)/);
  assert.match(s[`${KIT}/Form/Form.tsx`] ?? '', /from '@ab\/web-kit\/ui\/Button'/);
  assert.equal(s[`${KIT}/sizes.ts`], FILES[`${KIT}/sizes.ts`]);
  assert.equal(s[`${KIT}/chat-icons.tsx`], FILES[`${KIT}/chat-icons.tsx`]);
});

test('without --components a 2-file component stays where it is', () => {
  const s = folded(['--write', '--paths', KIT]);
  assert.equal(s[`${KIT}/button.tsx`], FILES[`${KIT}/button.tsx`]);
});
