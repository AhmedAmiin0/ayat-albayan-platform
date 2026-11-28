import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { BalanceCard } from '@/features/finance/subscriptions/balance/BalanceCard';
import { balanceOf, WEEKLY } from '@/features/finance/subscriptions/money-fixture';
import { mockCall } from '@ab/testing/mock-call';

// Confirm with an optional reason.

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const STUDENT = { id: 'stu-1', name: 'سهيلة', code: 'AB-0183' };
// A package made by mistake: nothing paid and no lesson used (WEEKLY has used 2).
const FRESH = {
  ...WEEKLY,
  balance: { ...WEEKLY.balance, lessons_used: 0, remaining: WEEKLY.lessons_total },
};

function renderCard(view = balanceOf([FRESH])) {
  mockApi.onRead(() => view);
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
    mockApi.reset('read');
    mockApi.reset('write');
  });

  it('nothing paid: «إلغاء الباقة» → confirm with the reason → POST /subscriptions/:id/cancel, then «أُلغيت الباقة»', async () => {
    renderCard();
    const dialog = await openDialog();
    expect(dialog.textContent).toContain(t.subscriptions.cancel.body);
    fireEvent.change(within(dialog).getByLabelText(t.subscriptions.cancel.reason), {
      target: { value: '  أُنشئت بالخطأ ' },
    });
    mockApi.onWrite(() => ({ ...WEEKLY, status: 'cancelled' }));
    fireEvent.click(within(dialog).getByRole('button', { name: t.subscriptions.cancel.confirm }));
    await vi.waitFor(() =>
      expect(mockApi.writes()).toContainEqual({
        method: 'POST',
        path: `/subscriptions/${WEEKLY.id}/cancel`,
        body: { reason: 'أُنشئت بالخطأ' },
      }),
    );
    expect(await screen.findByText(t.subscriptions.cancel.done)).toBeTruthy();
  });

  it('no reason sends an empty body; a 409 has_lessons reads in Arabic and the dialog stays', async () => {
    renderCard();
    const dialog = await openDialog();
    mockApi.onWrite(() => Promise.reject(new ApiError(409, { code: 'has_lessons' })));
    fireEvent.click(within(dialog).getByRole('button', { name: t.subscriptions.cancel.confirm }));
    expect(await within(dialog).findByText(t.subscriptions.cancel.errors.has_lessons)).toBeTruthy();
    expect(mockApi.writes()).toContainEqual({
      method: 'POST',
      path: `/subscriptions/${WEEKLY.id}/cancel`,
      body: {},
    });
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
    expect(mockApi.writes()).toHaveLength(0);
  });
});
