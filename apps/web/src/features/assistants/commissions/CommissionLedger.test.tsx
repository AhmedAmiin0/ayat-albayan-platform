import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { CommissionLedger } from './CommissionLedger';
import { ASSISTANT, COMMISSION } from '../fixtures';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/dashboard/link-mock')).Link }));

const EGP = { ...COMMISSION, id: 'c2', student: { id: 's2', code: 'AB-1002', name: 'جود' }, amount: 70, currency: 'EGP', base_currency: 'EGP', base_amount: 700 };
const VOIDED = { ...COMMISSION, id: 'c3', student: { id: 's3', code: 'AB-1003', name: 'منى' }, status: 'voided' as const, amount: 30, void_reason: 'دُفع بالخطأ' };

function renderLedger(rows = [COMMISSION, EGP, VOIDED], canWrite = true) {
  apiFetch.mockResolvedValue(rows);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CommissionLedger assistants={[ASSISTANT]} canWrite={canWrite} />
    </QueryClientProvider>,
  );
}

describe('CommissionLedger (R-ASST-02, R-ASST-05)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('totals the earned commissions per currency, never across them, and leaves voided ones out', async () => {
    renderLedger();
    await screen.findByText('سهيلة');
    const total = screen.getByText(t.assistants.ledger.total).parentElement;
    const lines = [...(total?.querySelectorAll('li') ?? [])].map((li) => li.textContent);
    expect(lines).toEqual(['70 ج.م', '50 ر.س']);
    expect(apiFetch).toHaveBeenCalledWith('/assistant-pay/commissions');
  });

  it('shows the void reason on a voided row and offers «إلغاء العمولة» only on earned ones', async () => {
    renderLedger();
    expect(await screen.findByText(`${t.assistants.ledger.voidedWhy.replace('{reason}', 'دُفع بالخطأ')}`)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: t.assistants.ledger.void })).toHaveLength(2);
  });

  it('read-only admins get no void button', async () => {
    renderLedger([COMMISSION], false);
    await screen.findByText('سهيلة');
    expect(screen.queryByRole('button', { name: t.assistants.ledger.void })).toBeNull();
  });

  it('the filters go to the API: assistant, month, status', async () => {
    renderLedger();
    await screen.findByText('سهيلة');
    fireEvent.change(screen.getByLabelText(t.assistants.ledger.assistant), { target: { value: 'a1' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/assistant-pay/commissions?assistantId=a1'));
    fireEvent.change(screen.getByLabelText(t.assistants.ledger.month), { target: { value: '2026-09' } });
    fireEvent.change(screen.getByLabelText(t.assistants.ledger.statusLabel), { target: { value: 'voided' } });
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/assistant-pay/commissions?assistantId=a1&status=voided&from=2026-09-01T00%3A00%3A00.000Z&to=2026-10-01T00%3A00%3A00.000Z'));
  });

  it('voiding needs a reason, then posts it', async () => {
    renderLedger([COMMISSION]);
    apiSend.mockResolvedValue(COMMISSION);
    fireEvent.click(await screen.findByRole('button', { name: t.assistants.ledger.void }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: t.assistants.ledger.void }));
    expect(await within(dialog).findByText(t.finance.reasonRequired)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText(t.finance.reason), { target: { value: 'اشتراك مسترد' } });
    fireEvent.click(within(dialog).getByRole('button', { name: t.assistants.ledger.void }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/assistant-pay/commissions/c1/void', { reason: 'اشتراك مسترد' }));
  });

  it('an empty ledger says so', async () => {
    renderLedger([]);
    expect(await screen.findByText(t.assistants.ledger.empty)).toBeTruthy();
  });
});
