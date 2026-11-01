import { render, screen } from '@testing-library/react-native';
import { partPaidLine } from '@/core/lib/money/format';
import { entry } from '@/sales/testing/fixtures';
import { HistoryEntryCard } from './HistoryEntryCard';

// «تفاصيل الطالب» (owner 2026-10-28): part_paid comes only to a self.sales_money viewer, only when part-paid.
const { id, package: pkg, status, starts_on, lessons_total, renews_on, ended_at, created_at, lessons_used, lessons_remaining } = entry({ status: 'unpaid' });
const brief = { id, package: pkg, status, starts_on, lessons_total, renews_on, ended_at, created_at, lessons_used, lessons_remaining };
const part = { paid: 80, price: 81, due: 1, currency: 'SAR' };

test('with part_paid: «مدفوعة جزئيًا: 80 من 81 ر.س · الباقي 1»', async () => {
  await render(<HistoryEntryCard entry={{ ...brief, part_paid: part }} current brief />);
  expect(screen.getByText(partPaidLine(part) ?? '')).toBeTruthy();
});

test('without it (not part-paid, or no money permission): no money line at all', async () => {
  await render(<HistoryEntryCard entry={brief} current brief />);
  expect(screen.queryByText(/الباقي/)).toBeNull();
});
