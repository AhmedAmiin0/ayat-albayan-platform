import { t } from '@/lib/i18n';
import { balanceOf, OLD_SUB_ID, subscription } from './fixtures';
import { packageLine } from './package-line';

const left = (used: number, status: 'active' | 'unpaid' | 'paused' | 'trial' = 'active') =>
  balanceOf(
    subscription({
      status,
      balance: { ...subscription().balance, lessons_used: used, remaining: 4 - used },
    }),
  );

test('no package (a trial student): no line', () => {
  expect(packageLine(balanceOf())).toBeNull();
  expect(packageLine(undefined)).toBeNull();
});

test('label from the shared packageProgress; saffron only at or under the threshold', () => {
  expect(packageLine(left(1))).toEqual({ label: 'فاضل 3 حلقات', alert: false });
  expect(packageLine(left(2))).toEqual({ label: 'فاضل حلقتين', alert: true });
  expect(packageLine(left(4))).toEqual({ label: t.subscriptions.progress.zero, alert: true });
  expect(packageLine(left(5))).toEqual({ label: 'حضر حلقة زيادة عن الباقة', alert: true });
});

test('the renewal threshold setting moves the saffron', () => {
  expect(packageLine(left(1), 3)?.alert).toBe(true);
  expect(packageLine(left(2), 1)?.alert).toBe(false);
});

test('a paused or trial package is never «دورك»', () => {
  expect(packageLine(left(4, 'paused'))?.alert).toBe(false);
  expect(packageLine(left(3, 'trial'))?.alert).toBe(false);
});

test('an early renewal: what is left counts across both packages', () => {
  const old = subscription({
    id: OLD_SUB_ID,
    status: 'active',
    balance: { ...subscription().balance, subscription_id: OLD_SUB_ID, lessons_used: 3, remaining: 1 },
  });
  const renewed = subscription({
    status: 'active',
    balance: { ...subscription().balance, lessons_used: 0, remaining: 4 },
  });
  expect(packageLine(balanceOf(old, renewed))).toEqual({ label: 'فاضل 5 حلقات', alert: false });
});
