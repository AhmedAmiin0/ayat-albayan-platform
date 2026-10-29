import { counted, subscriptionStatusStyle } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { child, sub, usedUp } from './people-fixtures';
import { familySummary } from './subscription-summary';

const s = t.inbox.subscription;
const paid = sub({ due_amount: 0 });
const kid = (id: string, subscription: ReturnType<typeof sub> | null) => child({ id, name: id, subscription });
const unpaidChip = { ...subscriptionStatusStyle.unpaid, label: t.enums.subscriptionStatus.unpaid };
const pausedChip = { ...subscriptionStatusStyle.paused, label: t.enums.subscriptionStatus.paused };

test('nobody has a package: the count, no chips, one «بلا باقة» naming them all', () => {
  expect(familySummary([kid('أحمد', null), kid('سارة', null), kid('علي', null)])).toEqual({
    chips: [],
    count: counted(s.students, 3),
    packaged: [],
    noPackage: s.noPackage.replace('{names}', 'أحمد · سارة · علي'),
  });
  expect(counted(s.students, 3)).toBe('3 طلاب');
  expect(counted(s.students, 2)).toBe('طالبان');
});

test('every package runs: «طالبان», never «مشترك: 2 من 2»', () => {
  const kids = [kid('a', paid), kid('b', paid)];
  expect(familySummary(kids)).toEqual({ chips: [], count: counted(s.students, 2), packaged: kids, noPackage: null });
});

test('mixed: «مشترك: 1 من 3», the ended package keeps its line, the child without one is named once', () => {
  const running = kid('a', paid);
  const ended = kid('b', usedUp);
  const summary = familySummary([running, ended, kid('c', null)]);
  expect(summary.count).toBe(s.subscribedOf.replace('{n}', '1').replace('{total}', '3'));
  expect(summary.packaged).toEqual([running, ended]);
  expect(summary.noPackage).toBe(s.noPackage.replace('{names}', 'c'));
});

test('money owed: one «غير مدفوع» for the family (the rows’ packageChip, not the DB status)', () => {
  // `active` in the DB but 120 still due: the row says «غير مدفوع», so the folded line must too.
  const owing = sub({ status: 'active', due_amount: 120 });
  expect(familySummary([kid('a', owing), kid('b', owing), kid('c', paid)]).chips).toEqual([unpaidChip]);
  // Paid in full and used up: the DB keeps `unpaid`, the rows show no chip, neither does the summary.
  const usedPaid = sub({ status: 'unpaid', due_amount: 0, lessons_remaining: 0 });
  expect(familySummary([kid('a', usedPaid), kid('b', null)]).chips).toEqual([]);
});

test('paused and unpaid both show while folded, once each', () => {
  const paused = sub({ status: 'paused', due_amount: 0 });
  const summary = familySummary([kid('a', paused), kid('b', sub()), kid('c', paused)]);
  expect(summary.chips).toEqual([pausedChip, unpaidChip]);
});

test('every package ended: the plain count (no «مشترك: 0 من 2»), each line kept', () => {
  const kids = [kid('a', usedUp), kid('b', usedUp)];
  expect(familySummary(kids)).toEqual({ chips: [], count: counted(s.students, 2), packaged: kids, noPackage: null });
});
