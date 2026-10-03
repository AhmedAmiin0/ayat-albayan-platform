import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { EARNINGS, PAYMENTS } from './fixtures';
import { TeacherEarningsPage } from './TeacherEarningsPage';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: {} }));

const tt = t.teacherEarnings;

async function render() {
  routeFetch(apiFetch, [
    ['/teachers/t-1/earnings/payments', PAYMENTS],
    ['/teachers/t-1/earnings', EARNINGS],
  ]);
  renderWithClient(<TeacherEarningsPage teacherId="t-1" />);
  await screen.findByRole('heading', { level: 1, name: tt.titleFor.replace('{name}', 'أبرار') });
}

const boxes = () => screen.getAllByRole('checkbox');
const rowBoxes = () => boxes().filter((b) => b.getAttribute('aria-label') !== tt.selectAll);

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('TeacherEarningsPage (admin)', () => {
  it('titles the page with the teacher, shows the balance and one tick per open session', async () => {
    await render();
    expect(await screen.findByTestId('balance-cards')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: tt.selectAll })).toBeTruthy();
    expect(rowBoxes()).toHaveLength(3);
    expect(screen.getByText(tt.status.paid)).toBeTruthy();
    expect(screen.getByText(tt.status.partially_paid)).toBeTruthy();
  });

  it('select-all ticks only the open sessions and the button counts them', async () => {
    await render();
    fireEvent.click(await screen.findByRole('checkbox', { name: tt.selectAll }));
    expect(rowBoxes().every((b) => (b as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByRole('button', { name: tt.paySelected.replace('{n}', '3') })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: tt.selectAll }));
    expect(screen.getByRole('button', { name: tt.pay })).toBeTruthy();
  });

  it('pays the selected total: dialog prefilled, then refetches and toasts «saved»', async () => {
    await render();
    fireEvent.click((await screen.findAllByRole('checkbox', { name: new RegExp(tt.selectRow) }))[0] as HTMLElement);
    fireEvent.click(screen.getByRole('button', { name: tt.paySelected.replace('{n}', '1') }));
    const dialog = screen.getByRole('dialog');
    const amount = within(dialog).getByRole('textbox', { name: tt.payAmount }) as HTMLInputElement;
    expect(amount.value).toBe('70');
    apiSend.mockResolvedValue(PAYMENTS[0]);
    const calls = apiFetch.mock.calls.length;
    fireEvent.click(within(dialog).getByRole('button', { name: tt.submit }));
    expect(await screen.findByText(tt.saved)).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThan(calls));
  });

  it('lists the payments with the payout chip and a receipt link only where one exists', async () => {
    await render();
    expect(await screen.findByText(tt.fromPayout)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: tt.viewReceipt })).toHaveLength(1);
  });

  it('opens the signed receipt URL in a new tab', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    await render();
    apiFetch.mockImplementation(async (path: string) => (path.endsWith('/receipt') ? { url: 'https://signed/r.jpg' } : EARNINGS));
    fireEvent.click(await screen.findByRole('button', { name: tt.viewReceipt }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://signed/r.jpg', '_blank', 'noopener,noreferrer'));
    expect(apiFetch).toHaveBeenCalledWith('/teachers/t-1/earnings/payments/p-2/receipt');
    open.mockRestore();
  });

  it('with nothing owed the pay button is disabled', async () => {
    routeFetch(apiFetch, [
      ['/teachers/t-1/earnings/payments', []],
      ['/teachers/t-1/earnings', { ...EARNINGS, balance: { ...EARNINGS.balance, outstanding: 0, open_sessions: 0 }, sessions: [] }],
    ]);
    renderWithClient(<TeacherEarningsPage teacherId="t-1" />);
    const pay = await screen.findByRole('button', { name: tt.pay });
    expect((pay as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(tt.empty)).toBeTruthy();
    expect(screen.getByText(tt.paymentsEmpty)).toBeTruthy();
  });
});
