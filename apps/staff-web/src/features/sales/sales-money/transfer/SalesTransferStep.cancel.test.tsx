import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { OPEN_SUB, student } from '@/features/sales/sales-money/sales-money-fixture';
import { SalesMoneyFlow } from '@/features/sales/sales-money/SalesMoneyFlow';

// «إلغاء الباقة» from her transfer step (owner 2026-10-28): a package she made by mistake, nothing paid.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

function open(sub = OPEN_SUB) {
  routeFetch(apiFetch, [['/settings', {}]]);
  const onClose = vi.fn();
  renderWithClient(<SalesMoneyFlow start="transfer" students={[student({ open: [sub] })]} onClose={onClose} />);
  return { dialog: within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer })), onClose };
}

describe('step 2: cancel a package made by mistake', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('nothing paid: «إلغاء الباقة» → confirm → POST /sales/subscriptions/:id/cancel, and the flow closes', async () => {
    const { dialog, onClose } = open({ ...OPEN_SUB, paid: 0 });
    fireEvent.click(dialog.getByRole('button', { name: t.subscriptions.cancel.action }));
    const confirm = within(await screen.findByRole('dialog', { name: t.subscriptions.cancel.title }));
    apiSend.mockResolvedValue({ ...OPEN_SUB, status: 'cancelled', due: 0 });
    fireEvent.click(confirm.getByRole('button', { name: t.subscriptions.cancel.confirm }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', `/sales/subscriptions/${OPEN_SUB.id}/cancel`, {}));
    await vi.waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('a package with money already paid offers no cancel', () => {
    const { dialog } = open({ ...OPEN_SUB, paid: 50 });
    expect(dialog.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
  });
});
