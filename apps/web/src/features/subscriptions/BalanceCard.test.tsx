import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { BalanceCard } from './BalanceCard';
import { balanceOf, WEEKLY } from './money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch, apiSend }));

const STUDENT = { id: 'stu-1', name: 'سهيلة', code: 'AB-0183' };

function renderCard(view = balanceOf([WEEKLY])) {
  apiFetch.mockResolvedValue(view);
  render(
    <QueryClientProvider client={new QueryClient()}>
      <BalanceCard student={STUDENT} />
    </QueryClientProvider>,
  );
}

describe('BalanceCard (S6: the student package on the profile)', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('the packageProgress line, used of total, paid of price, the projected end', async () => {
    renderCard();
    expect(await screen.findByText('فاضل حلقتين')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/students/stu-1/balance');
    expect(screen.getByText(new RegExp(t.subscriptions.usedOf.replace('{used}', '2').replace('{total}', '4')))).toBeTruthy();
    expect(screen.getByText(t.enums.subscriptionStatus.unpaid)).toBeTruthy();
    expect(screen.getByText(/متوقع تخلص يوم/)).toBeTruthy();
  });

  it('nothing left on an unpaid package → «الباقة مش مدفوعة»', async () => {
    const used = { ...WEEKLY, balance: { ...WEEKLY.balance, lessons_used: 4, remaining: 0 } };
    renderCard(balanceOf([used]));
    expect(await screen.findByText(t.subscriptions.unpaidFlag)).toBeTruthy();
    expect(screen.getByText(t.subscriptions.progress.zero)).toBeTruthy();
  });

  it('no package yet → the empty line and «اشتراك جديد»', async () => {
    renderCard(balanceOf([]));
    expect(await screen.findByText(t.subscriptions.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.payments.record })).toBeNull();
  });

  it('records the payment on the current package, in its currency (journey 3)', async () => {
    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: t.payments.record }));
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain(t.payments.mobile.recordFor.replace('{student}', 'سهيلة'));
    apiSend.mockResolvedValue({ id: 'pay-1' });
    fireEvent.click(screen.getAllByRole('button', { name: t.payments.record }).at(-1) as HTMLElement);
    await vi.waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith(
        'POST',
        '/payments',
        expect.objectContaining({ subscriptionId: 'sub-1', amount: 145, currency: 'SAR', method: 'bank', receiptPath: null }),
      ),
    );
    expect(await screen.findByRole('status')).toBeTruthy();
  });
});
