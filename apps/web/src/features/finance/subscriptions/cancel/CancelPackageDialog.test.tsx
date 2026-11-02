import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { BalanceCard } from '@/features/finance/subscriptions/balance/BalanceCard';
import { balanceOf, WEEKLY } from '@/features/finance/subscriptions/money-fixture';

// «إلغاء الباقة» on the profile's package card (owner 2026-10-28): a confirm with an optional reason.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const STUDENT = { id: 'stu-1', name: 'سهيلة', code: 'AB-0183' };
// A package made by mistake: nothing paid and no lesson used (WEEKLY has used 2).
const FRESH = { ...WEEKLY, balance: { ...WEEKLY.balance, lessons_used: 0, remaining: WEEKLY.lessons_total } };

function renderCard(view = balanceOf([FRESH])) {
  apiFetch.mockResolvedValue(view);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BalanceCard student={STUDENT} />
    </QueryClientProvider>,
  );
}

async function openDialog() {
  fireEvent.click(await screen.findByRole('button', { name: t.subscriptions.cancel.action }));
  return screen.findByRole('dialog');
}

describe('CancelPackageDialog from the BalanceCard', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('nothing paid: «إلغاء الباقة» → confirm with the reason → POST /subscriptions/:id/cancel, then «أُلغيت الباقة»', async () => {
    renderCard();
    const dialog = await openDialog();
    expect(dialog.textContent).toContain(t.subscriptions.cancel.body);
    fireEvent.change(within(dialog).getByLabelText(t.subscriptions.cancel.reason), { target: { value: '  أُنشئت بالخطأ ' } });
    apiSend.mockResolvedValue({ ...WEEKLY, status: 'cancelled' });
    fireEvent.click(within(dialog).getByRole('button', { name: t.subscriptions.cancel.confirm }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `/subscriptions/${WEEKLY.id}/cancel`, { reason: 'أُنشئت بالخطأ' }));
    expect(await screen.findByText(t.subscriptions.cancel.done)).toBeTruthy();
  });

  it('no reason sends an empty body; a 409 has_lessons reads in Arabic and the dialog stays', async () => {
    renderCard();
    const dialog = await openDialog();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'has_lessons' }));
    fireEvent.click(within(dialog).getByRole('button', { name: t.subscriptions.cancel.confirm }));
    expect(await within(dialog).findByText(t.subscriptions.cancel.errors.has_lessons)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', `/subscriptions/${WEEKLY.id}/cancel`, {});
  });

  it('a package with money paid offers no cancel', async () => {
    renderCard(balanceOf([{ ...FRESH, paid: 50 }]));
    expect(await screen.findByRole('button', { name: t.payments.record })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
  });

  it('a package that already used lessons (FIFO, any rule) offers no cancel', async () => {
    renderCard(balanceOf([WEEKLY]));
    expect(await screen.findByRole('button', { name: t.payments.record })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
  });

  it('«رجوع» closes without cancelling', async () => {
    renderCard();
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.back }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).not.toHaveBeenCalled();
  });
});
