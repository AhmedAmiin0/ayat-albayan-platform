import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { OPEN_SUB, paymentView, student } from '../sales-money-fixture';
import { SalesMoneyFlow } from '../SalesMoneyFlow';

// sales.renew_any (owner 2026-10-29, docs/16 row 38): the transfer for a child of the chat's family not hers.

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const PHONE = '+966551110000';

function open(mine: boolean) {
  routeFetch(apiFetch, [['/settings', {}]]);
  apiSend.mockResolvedValue(paymentView());
  renderWithClient(<SalesMoneyFlow start="transfer" phone={PHONE} students={[student({ mine, open: [OPEN_SUB] })]} onClose={vi.fn()} />);
  return within(screen.getByRole('dialog', { name: t.salesMoney.stepTransfer }));
}

describe('step 2 for a child listed through sales.renew_any', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('not hers: POST /sales/payments carries the chat phone; no «إلغاء الباقة»', async () => {
    const dialog = open(false);
    expect(dialog.queryByRole('button', { name: t.subscriptions.cancel.action })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: t.salesMoney.saveTransfer }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments', expect.objectContaining({ subscriptionId: OPEN_SUB.id, phone: PHONE })));
  });

  it('hers: the body has no phone (unchanged) and «إلغاء الباقة» stays', async () => {
    const dialog = open(true);
    expect(dialog.getByRole('button', { name: t.subscriptions.cancel.action })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.salesMoney.saveTransfer }));
    await vi.waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payments', expect.not.objectContaining({ phone: expect.anything() })));
  });
});
