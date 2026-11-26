import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BASE, MONEY, PATH, run, why } from './adopt.testing.ts';

const OLD = `${MONEY}/use-my-payment-amount.ts`;

test('a hook other code imports is renamed to its purpose first', () => {
  const other = `${MONEY}/Other.tsx`;
  const files = {
    ...BASE,
    [other]: "import { useMyPaymentAmount } from './use-my-payment-amount';\n",
  };
  assert.match(why(run(files)), /also imported by .*Other\.tsx: rename it to its purpose first/);
});

test('a hook that calls apiFetch or a raw effect stays where it is', () => {
  const effect = BASE[OLD].replace(
    'return useMutation',
    'useEffect(() => {});\n  return useMutation',
  );
  assert.match(why(run({ ...BASE, [OLD]: effect })), /calls useEffect/);
  const http = BASE[OLD].replace('update(id, n)', 'apiFetch(id, n)');
  assert.match(why(run({ ...BASE, [OLD]: http })), /calls apiFetch/);
});

test('statements beside the hook call are merged by hand', () => {
  const view = BASE[PATH].replace('const save', 'const [n] = useState(0);\n  const save');
  assert.match(why(run({ ...BASE, [PATH]: view })), /statements beside useMyPaymentAmount/);
});

test('a hook from a package or another kind of file is not adopted', () => {
  const pkg = BASE[PATH].replace('@/features/money/use-my-payment-amount', '@ab/client-core');
  assert.match(why(run({ ...BASE, [PATH]: pkg })), /comes from @ab\/client-core/);
});

test('shared private values, re-exports and non-hook exports are refused', () => {
  const shared = `${BASE[OLD]}const K = 1;\nexport function useA() { return K; }\nexport function useB() { return K; }\n`;
  assert.match(why(run({ ...BASE, [OLD]: shared })), /K is read by useA and useB/);
  const reexport = `${BASE[OLD]}export { x } from './x';\n`;
  assert.match(why(run({ ...BASE, [OLD]: reexport })), /re-exports/);
  const value = `${BASE[OLD]}export const LIMIT = 3;\n`;
  assert.match(why(run({ ...BASE, [OLD]: value })), /exports LIMIT, not a hook/);
});

test('a folder that already holds the target file is refused', () => {
  assert.match(
    why(run(BASE, { folder: ['MyPaymentAmount.tsx', 'use-my-payment-amount.ts'] })),
    /use-my-payment-amount\.ts already exists/,
  );
});

test('a test that mocks a hook module with extra exports is refused', () => {
  const hook = `${BASE[OLD]}export function useMore() { return useMyPaymentAmount('a'); }\n`;
  const testPath = `${MONEY}/x.test.ts`;
  const mock =
    "import { useMore } from './use-my-payment-amount';\nvi.mock('./use-my-payment-amount');\n";
  assert.match(why(run({ ...BASE, [OLD]: hook, [testPath]: mock })), /mocks the hook module/);
});
