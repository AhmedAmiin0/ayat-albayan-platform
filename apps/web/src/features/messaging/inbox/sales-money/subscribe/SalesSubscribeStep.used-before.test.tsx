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

// «حلقات مستخدمة من الباقة» (owner 2026-10-28): only with «بدأ الاشتراك سابقًا»; standard = 12 lessons.
const creates = () => apiSend.mock.calls.filter(([, path]) => path === '/sales/subscriptions').map((c) => c[2] as Record<string, unknown>);
const past = daysBefore(todayIn('Asia/Riyadh'), 30);

function open() {
  routeFetch(apiFetch, [['/settings', {}], ['/sales/money/chat-receipts', []]]);
  apiSend.mockImplementation(async (_m: string, path: string) => (path === '/sales/subscriptions/quote' ? SALES_QUOTE : OPEN_SUB));
  renderWithClient(<SalesMoneyFlow start="subscribe" students={[student()]} onClose={vi.fn()} />);
  const dialog = within(screen.getByRole('dialog', { name: t.salesMoney.newSubscription }));
  const box = () => fireEvent.click(dialog.getByRole('checkbox', { name: new RegExp(t.salesMoney.alreadyStarted) }));
  const stepper = () => dialog.queryByRole('group', { name: t.salesMoney.usedBefore });
  const more = (n: number) => {
    for (let i = 0; i < n; i += 1) fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.usedBeforeMore }));
  };
  const save = () => fireEvent.click(dialog.getByRole('button', { name: t.salesMoney.saveSubscription }));
  return { dialog, box, stepper, more, save };
}

describe('lessons used before the platform, in «اشتراك جديد»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('shown only with the box, at 0 with its note; − / + only, never typed', () => {
    const { dialog, box, stepper } = open();
    expect(stepper()).toBeNull();
    box();
    expect(stepper()?.textContent).toContain('0');
    expect(dialog.getByText(t.salesMoney.usedBeforeHint)).toBeTruthy();
    expect(dialog.getByRole('button', { name: t.salesMoney.usedBeforeLess }).hasAttribute('disabled')).toBe(true);
    expect(stepper()?.querySelector('input')).toBeNull();
  });

  it('the body carries lessonsUsedBefore with alreadyStarted and the past day', async () => {
    const { dialog, box, more, save } = open();
    box();
    fireEvent.change(dialog.getByLabelText(t.salesMoney.startsOn), { target: { value: past } });
    more(2);
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ startsOn: past, alreadyStarted: true, lessonsUsedBefore: 2 });
  });

  it('unticking the box puts it back to 0, and 0 is not sent', async () => {
    const { dialog, box, stepper, more, save } = open();
    box();
    more(3);
    box();
    expect(stepper()).toBeNull();
    box();
    expect(stepper()?.textContent).toContain('0');
    fireEvent.change(dialog.getByLabelText(t.salesMoney.startsOn), { target: { value: past } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).not.toHaveProperty('lessonsUsedBefore');
  });

  it('a smaller package clamps it to every lesson but one', async () => {
    const { dialog, box, stepper, more, save } = open();
    box();
    more(20);
    expect(stepper()?.textContent).toContain('11');
    fireEvent.change(dialog.getByLabelText(t.subscriptions.package), { target: { value: 'weekly' } });
    expect(stepper()?.textContent).toContain('3');
    fireEvent.change(dialog.getByLabelText(t.salesMoney.startsOn), { target: { value: past } });
    save();
    await vi.waitFor(() => expect(creates()).toHaveLength(1));
    expect(creates()[0]).toMatchObject({ lessonsUsedBefore: 3 });
  });
});
