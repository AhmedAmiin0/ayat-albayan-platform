import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { PAYMENTS } from './fixtures';
import { PayDialog } from './PayDialog';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/lib/supabase', () => ({ supabase: { storage: { from: () => ({ uploadToSignedUrl: vi.fn() }) } } }));

const IDS = ['e-3', 'e-1'];
const posts = () => apiSend.mock.calls.filter(([, path]) => path === '/teachers/t-1/earnings/payments');

function open(over: { earningIds?: string[] } = {}) {
  const onSaved = vi.fn();
  renderWithClient(<PayDialog teacherId="t-1" earningIds={over.earningIds ?? IDS} due={110} onClose={vi.fn()} onSaved={onSaved} />);
  const dialog = screen.getByRole('dialog');
  const amount = within(dialog).getByRole('textbox', { name: t.teacherEarnings.payAmount });
  const submit = () => fireEvent.click(within(dialog).getByRole('button', { name: t.teacherEarnings.submit }));
  return { dialog, amount, submit, onSaved };
}

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('PayDialog (teacher earnings)', () => {
  it('prefills the ticked total, says what is due, and explains the allocation', () => {
    const { dialog, amount } = open();
    expect((amount as HTMLInputElement).value).toBe('110');
    expect(within(dialog).getByText(t.teacherEarnings.selectedDue.replace('{amount}', `110 ${t.payouts.currency}`))).toBeTruthy();
    expect(within(dialog).getByText(t.teacherEarnings.allocationHint)).toBeTruthy();
  });

  it('an amount above what is due is blocked on the client: nothing is sent', () => {
    const { dialog, amount, submit } = open();
    fireEvent.change(amount, { target: { value: '110.01' } });
    submit();
    expect(within(dialog).getByText(t.teacherEarnings.error.over_payment)).toBeTruthy();
    expect(amount.getAttribute('aria-invalid')).toBe('true');
    for (const bad of ['', '0', '12.345']) {
      fireEvent.change(amount, { target: { value: bad } });
      submit();
    }
    expect(posts()).toHaveLength(0);
  });

  it('a partial amount is sent with the ticked ids, the method and a request id', async () => {
    apiSend.mockResolvedValue(PAYMENTS[0]);
    const { amount, submit, onSaved } = open();
    fireEvent.change(amount, { target: { value: '١٠٠' } });
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(posts()[0]?.[2]).toMatchObject({ amount: 100, method: 'bank', earningIds: IDS, note: null, receiptPath: null });
    expect(posts()[0]?.[2].clientRequestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('no ticks: earningIds is left out so the API pays every open session', async () => {
    apiSend.mockResolvedValue(PAYMENTS[0]);
    const { submit, onSaved } = open({ earningIds: [] });
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(posts()[0]?.[2]).not.toHaveProperty('earningIds');
  });

  it('a retry after a failure re-sends the same clientRequestId', async () => {
    const { dialog, submit, onSaved } = open();
    apiSend.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue(PAYMENTS[0]);
    submit();
    expect(await within(dialog).findByText(t.payments.mobile.offline)).toBeTruthy();
    submit();
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    const [first, second] = posts();
    expect(first?.[2].clientRequestId).toBe(second?.[2].clientRequestId);
  });

  it.each(['over_payment', 'nothing_due', 'receipt_path', 'earning_not_found', 'teacher_not_found'] as const)(
    'maps the %s error code to its Arabic line',
    async (code) => {
      const { dialog, submit } = open();
      apiSend.mockRejectedValue(new ApiError(400, { code }));
      submit();
      expect(await within(dialog).findByText(t.teacherEarnings.error[code])).toBeTruthy();
    },
  );

  it('409 client_request_reused says the payment already exists', async () => {
    const { dialog, submit } = open();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'client_request_reused' }));
    submit();
    expect(await within(dialog).findByText(t.teacherEarnings.error.client_request_reused)).toBeTruthy();
  });
});
