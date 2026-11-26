import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adopted, BASE, DIR, HOOK, MONEY, PATH, run, squash } from './adopt.testing.ts';

const OLD = `${MONEY}/use-my-payment-amount.ts`;

test('a same-name hook only its component reads moves into the folder (MyPaymentAmount)', () => {
  const v = adopted(run(BASE));
  assert.deepEqual(v.deleted, [OLD]);
  assert.equal(
    squash(v.files[`${DIR}/use-my-payment-amount.ts`]),
    squash(HOOK.replace("'./api'", "'@/features/money/api'")),
  );
  assert.match(
    v.files[PATH] ?? '',
    /import \{ useMyPaymentAmount \} from '\.\/use-my-payment-amount';/,
  );
  assert.match(v.files[PATH] ?? '', /import \{ Dialog \} from '@\/ui\/Dialog';/);
});

test('a hook already in the folder, or none, is left alone', () => {
  const done = BASE[PATH].replace(
    '@/features/money/use-my-payment-amount',
    './use-my-payment-amount',
  );
  assert.deepEqual(run({ ...BASE, [PATH]: done }), { result: 'none' });
  const plain = 'export function MyPaymentAmount() {\n  return <b />;\n}\n';
  assert.deepEqual(run({ ...BASE, [PATH]: plain }), { result: 'none' });
});

test('an extra export leaves for its own purpose-named file and a test follows it (QuoteSheet)', () => {
  const hook = `${HOOK}
/** One send at a time. */
export function useQuoteSend(id: string) {
  return useMyPaymentAmount(id);
}
`;
  const testPath = `${MONEY}/use-quote-send.test.ts`;
  const testText = `import { useQuoteSend } from './use-my-payment-amount';
vi.mock('./api');
useQuoteSend('a');
`;
  const v = adopted(run({ ...BASE, [OLD]: hook, [testPath]: testText }));
  const send = v.files[`${DIR}/use-quote-send.ts`] ?? '';
  assert.match(send, /^import \{ useMyPaymentAmount \} from '\.\/use-my-payment-amount';/);
  assert.match(send, /\/\*\* One send at a time\. \*\/\nexport function useQuoteSend/);
  assert.doesNotMatch(v.files[`${DIR}/use-my-payment-amount.ts`] ?? '', /useQuoteSend/);
  assert.match(
    v.files[testPath] ?? '',
    /^import \{ useQuoteSend \} from '\.\/MyPaymentAmount\/use-quote-send';/,
  );
});

test('private values follow the export that reads them', () => {
  const hook = HOOK.replace(
    'export function',
    'const KEY = 1;\nconst read = () => KEY;\n\nexport function',
  ).replace('update(id, n)', 'update(id, n + read())');
  const own = adopted(run({ ...BASE, [OLD]: hook })).files[`${DIR}/use-my-payment-amount.ts`];
  assert.match(own ?? '', /const KEY = 1;\nconst read = \(\) => KEY;/);
});

test('a test mock of the hook module follows the hook into the folder', () => {
  const testPath = `${MONEY}/money.test.tsx`;
  const mock = `import { useMyPaymentAmount } from './use-my-payment-amount';
vi.mock('./use-my-payment-amount', () => ({ useMyPaymentAmount: vi.fn() }));
vi.mock('./api');
`;
  const out = adopted(run({ ...BASE, [testPath]: mock })).files[testPath] ?? '';
  assert.match(
    out,
    /import \{ useMyPaymentAmount \} from '\.\/MyPaymentAmount\/use-my-payment-amount';/,
  );
  assert.match(out, /vi\.mock\('\.\/MyPaymentAmount\/use-my-payment-amount', \(\) =>/);
  assert.match(out, /vi\.mock\('\.\/api'\);/);
});
