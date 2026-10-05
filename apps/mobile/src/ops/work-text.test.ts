import { t } from '@/lib/i18n';
import { work } from './fixtures';
import { currencyLabel, packageText, pendingSubtitle, taskText, unpaidSubtitle } from './work-text';

test('a renewal task names the student and what is left', () => {
  const task = work.tasks.items[0];
  if (!task) throw new Error('fixture');
  const text = taskText(task);
  expect(text).toContain('سارة أحمد');
  expect(text).not.toContain('{');
});

test('a task without a student or balance keeps no placeholder', () => {
  expect(taskText({ kind: 'subscription_unpaid', student: null, balance: null })).not.toContain(
    '{',
  );
});

test('a pending report line says the teacher and the Riyadh day', () => {
  const row = work.pending_reports.items[0];
  if (!row) throw new Error('fixture');
  expect(pendingSubtitle(row)).toContain('أبرار');
  expect(pendingSubtitle(row)).toContain('·');
});

test('an unpaid line: the package, then what is owed rounded to whole units', () => {
  const row = work.unpaid.items[0];
  if (!row) throw new Error('fixture');
  expect(packageText(row)).toContain('6');
  expect(unpaidSubtitle(row)).toBe(
    `${packageText(row)} · ${t.dashboard.owes}: 1,200 ${currencyLabel('SAR')}`,
  );
  expect(unpaidSubtitle({ ...row, reason: 'renewal_due' })).toContain(t.dashboard.renewalDue);
});

test('a currency without a site label shows its ISO code', () => {
  expect(currencyLabel('EGP')).toBeTruthy();
  expect(currencyLabel('XYZ')).toBe('XYZ');
});
