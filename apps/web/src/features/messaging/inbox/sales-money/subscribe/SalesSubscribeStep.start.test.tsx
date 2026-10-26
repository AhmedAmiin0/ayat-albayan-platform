import { daysBefore } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayIn } from '@/features/finance/subscriptions/create/pricing-form';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { OPEN_SUB, SALES_QUOTE, student } from '../sales-money-fixture';
import { SalesMoneyFlow } from '../SalesMoneyFlow';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['subscriptions.set_start_date'], can: (p: string) => p === 'subscriptions.set_start_date' }),
}));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const creates = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/subscriptions').map((c) => c[2] as Record<string, unknown>);
const today = todayIn('Asia/Riyadh');

function open() {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []]]);
  apiSend.mockImplementation(async (_m: string, path: string) => (path === '/sales/subscriptions/quote' ? SALES_QUOTE : OPEN_SUB));
  renderWithClient(<SalesMoneyFlow start="subscribe" students={[student()]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
  const date = dialog.getByLabelText<HTMLInputElement>(t.salesMoney.startsOn);
  const box = dialog.getByRole<HTMLInputElement>('checkbox', { name: new RegExp(t.salesMoney.alreadyStarted) });
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
  return { dialog, date, box, save };
}

describe('the start day with subscriptions.set_start_date (docs/16 row 24)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('shows the date (min today) and «بدأ الاشتراك سابقًا»; a later day is sent without alreadyStarted', async () => {
    const { dialog, date, box, save } = open();
    expect(date.min).toBe(today);
    expect(box.checked).toBe(false);
    expect(dialog.getByText(t.salesMoney.alreadyStartedHint)).toBeTruthy();
    fireEvent.change(date, { target: { value: '2099-01-01' } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ startsOn: '2099-01-01' });
    expect(creates()[0]).not.toHaveProperty('alreadyStarted');
  });

  it('a past day is blocked without the box', () => {
    const { dialog, date, save } = open();
    fireEvent.change(date, { target: { value: daysBefore(today, 10) } });
    save();
    expect(dialog.getByText(t.salesMoney.error.start_date_past)).toBeTruthy();
    expect(creates()).toHaveLength(0);
  });

  it('with the box: a past day up to a year back is sent with alreadyStarted; older is blocked', async () => {
    const { dialog, date, box, save } = open();
    fireEvent.click(box);
    expect(date.min).toBe(daysBefore(today, 365));
    fireEvent.change(date, { target: { value: daysBefore(today, 400) } });
    save();
    expect(dialog.getByText(t.salesMoney.error.start_date_too_old)).toBeTruthy();
    expect(creates()).toHaveLength(0);
    fireEvent.change(date, { target: { value: daysBefore(today, 30) } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ startsOn: daysBefore(today, 30), alreadyStarted: true });
  });
});
