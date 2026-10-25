import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { BALANCE, page, PAYMENT, SESSIONS } from './fixtures';
import { TeacherEarningsPage } from './TeacherEarningsPage';

vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));
const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@/lib/http/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: vi.fn() }) } } }));

function open() {
  apiFetch.mockImplementation((path: string) => {
    if (path.includes('/sessions')) return Promise.resolve(page(SESSIONS));
    if (path.includes('/payments')) return Promise.resolve(page([PAYMENT]));
    return Promise.resolve(BALANCE);
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <TeacherEarningsPage teacherId="t1" />
    </QueryClientProvider>,
  );
}
const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`${t.earnings.pay}|${t.earnings.payChosen.split('{count}')[0]}`) }));
  return screen.findByRole('dialog');
};
const amountBox = (d: HTMLElement) => within(d).getByRole('textbox', { name: new RegExp(t.payments.amount) });
const confirm = (d: HTMLElement) => fireEvent.click(within(d).getByRole('button', { name: t.earnings.confirm }));

describe('TeacherEarningsPage «مستحقات المعلم»', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('shows the three balance cards, the sessions with their status, and the payment history', async () => {
    open();
    expect(await screen.findByText(t.earnings.earned)).toBeTruthy();
    expect(screen.getByText(t.earnings.paid)).toBeTruthy();
    expect(screen.getByText(t.earnings.unpaidCount.replace('{count}', '2'))).toBeTruthy();
    expect(await screen.findByText(t.earnings.statusName.partially_paid)).toBeTruthy();
    expect(screen.getByText(t.earnings.statusName.paid)).toBeTruthy();
    expect(await screen.findByText('دفعة أكتوبر')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.earnings.viewReceipt })).toBeTruthy();
  });

  it('a fully paid session cannot be ticked; ticking the others names the count in the button', async () => {
    open();
    await screen.findByText(t.earnings.statusName.partially_paid);
    const boxes = screen.getAllByRole('checkbox') as HTMLInputElement[]; // [all, e3, e2, e1]
    expect(boxes[3]?.disabled).toBe(true);
    fireEvent.click(boxes[1] as HTMLElement);
    fireEvent.click(boxes[2] as HTMLElement);
    expect(screen.getByRole('button', { name: t.earnings.payChosen.replace('{count}', '2') })).toBeTruthy();
  });

  it('paying the ticked sessions: the amount defaults to what they owe and the ids go with the payment', async () => {
    open();
    await screen.findByText(t.earnings.statusName.partially_paid);
    fireEvent.click(screen.getAllByRole('checkbox')[2] as HTMLElement); // the 60 still owed on e2
    const dialog = await openDialog();
    expect((amountBox(dialog) as HTMLInputElement).value).toBe('60');
    fireEvent.change(amountBox(dialog), { target: { value: '25.5' } });
    apiSend.mockResolvedValue({ payment: PAYMENT, replayed: false });
    confirm(dialog);
    await waitFor(() => expect(apiSend).toHaveBeenCalled());
    expect(apiSend).toHaveBeenCalledWith('POST', '/teacher-earnings/t1/payments', expect.objectContaining({
      amount: 25.5, method: 'bank', earningIds: ['e2'], receiptPath: null, clientRequestId: expect.any(String),
    }));
    expect(await screen.findByText(t.earnings.saved)).toBeTruthy();
  });

  it('more than the chosen sessions owe is refused in the dialog and nothing is sent', async () => {
    open();
    await screen.findByText(t.earnings.statusName.partially_paid);
    fireEvent.click(screen.getAllByRole('checkbox')[2] as HTMLElement);
    const dialog = await openDialog();
    fireEvent.change(amountBox(dialog), { target: { value: '60.01' } });
    confirm(dialog);
    expect(await within(dialog).findByText(t.earnings.overpayment.replace('{amount}', '60 ج.م'))).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('nothing ticked: no ids are sent (the API pays oldest first) and a retry re-sends the same clientRequestId', async () => {
    open();
    await screen.findByText(t.earnings.statusName.partially_paid);
    const dialog = await openDialog();
    expect((amountBox(dialog) as HTMLInputElement).value).toBe('110');
    apiSend.mockRejectedValueOnce(new TypeError('network')).mockResolvedValue({ payment: PAYMENT, replayed: true });
    confirm(dialog);
    expect(await within(dialog).findByText(t.payments.mobile.offline)).toBeTruthy();
    confirm(dialog);
    await waitFor(() => expect(apiSend).toHaveBeenCalledTimes(2));
    const [first, second] = apiSend.mock.calls.map((c) => c[2] as { clientRequestId: string; earningIds?: string[] });
    expect(first?.earningIds).toBeUndefined();
    expect(second?.clientRequestId).toBe(first?.clientRequestId);
    expect(await screen.findByText(t.earnings.replayed)).toBeTruthy();
  });
});
