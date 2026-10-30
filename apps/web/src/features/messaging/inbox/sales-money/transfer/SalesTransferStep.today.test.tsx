import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { OPEN_SUB, student } from '@/features/messaging/inbox/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/messaging/inbox/sales-money/SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend: vi.fn() }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

// 23:30 in Riyadh on the 27th.
beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-27T20:30:00Z'), toFake: ['Date'] }));
afterEach(() => {
  vi.useRealTimers();
  apiFetch.mockReset();
});

it('«سجّل التحويل»: Riyadh\'s day is read once when the dialog opens and held (the default and the max)', () => {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts?', []]]);
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [OPEN_SUB] })]} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: t.salesMoney.stepTransfer });
  const day = () => dialog.querySelector('input[type="date"]');
  expect(day()?.getAttribute('value')).toBe('2026-10-27');
  expect(day()?.getAttribute('max')).toBe('2026-10-27');
  // Past midnight in Riyadh, then a re-render: the day stays the one the dialog opened on.
  vi.setSystemTime(new Date('2026-10-27T21:30:00Z'));
  fireEvent.change(within(dialog).getByRole('textbox', { name: t.salesMoney.amount }), { target: { value: '10' } });
  expect(day()?.getAttribute('max')).toBe('2026-10-27');
  expect(day()?.getAttribute('value')).toBe('2026-10-27');
});
