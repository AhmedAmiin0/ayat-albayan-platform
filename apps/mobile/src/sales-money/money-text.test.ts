import { t } from '@/lib/i18n';
import { byCurrency, commissionText, lineText, myCommissionText, salaryText, sinceText, statementWhen } from './money-text';

const p = t.assistantPortal.earnings;

test('a statement says when it was paid, else approved, else nothing (a draft)', () => {
  expect(statementWhen({ paid_at: '2026-10-03T09:00:00Z', approved_at: '2026-10-01T09:00:00Z' })).toMatch(p.paidAt.replace('{date}', ''));
  expect(statementWhen({ paid_at: null, approved_at: '2026-10-01T09:00:00Z' })).toMatch(p.approvedAt.replace('{date}', ''));
  expect(statementWhen({ paid_at: null, approved_at: null })).toBeNull();
});

test('statement lines: salary, a commission with its student, an adjustment with its reason', () => {
  expect(lineText({ kind: 'salary', amount: 1, currency: 'EGP', student: null, reason: null })).toBe(p.line.salary);
  expect(lineText({ kind: 'commission', amount: 1, currency: 'EGP', student: { code: 'AB-1', name: 'سهيلة' }, reason: null })).toBe(
    p.line.commission.replace('{student}', 'سهيلة'),
  );
  expect(lineText({ kind: 'adjustment', amount: -1, currency: 'EGP', student: null, reason: 'تصحيح' })).toBe(p.line.adjustment.replace('{reason}', 'تصحيح'));
});

test('terms in words: percent, fixed in its own currency, or not set', () => {
  const percent = { type: 'percent' as const, value: 12.5, currency: null, starts_on: '2026-10-01' };
  expect(myCommissionText(percent)).toBe(p.commissionPercent.replace('{value}', '12.5'));
  expect(commissionText(percent)).toBe(t.assistants.commissionPercent.replace('{value}', '12.5'));
  expect(commissionText({ type: 'fixed', value: 50, currency: 'SAR', starts_on: '2026-10-01' })).toMatch(/50/);
  expect(commissionText(null)).toBe(t.assistants.notSet);
  expect(salaryText(null)).toBe(t.assistants.notSet);
  expect(sinceText(undefined)).toBeNull();
  expect(sinceText('2026-10-01')).toMatch(/2026/);
});

test('per-currency entries are sorted by currency and never merged', () => {
  expect(byCurrency({ SAR: 1, EGP: 2 })).toEqual([
    ['EGP', 2],
    ['SAR', 1],
  ]);
});
