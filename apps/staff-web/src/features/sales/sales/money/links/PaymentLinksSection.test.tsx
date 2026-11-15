import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { linkView } from './link.fixture';
import { PaymentLinksSection } from './PaymentLinksSection';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const P = t.paymentLinks;
const LINKS = [
  linkView(),
  linkView({ id: 'link-2', status: 'paid', kind: 'renewal', paid_at: '2026-10-27T09:00:00Z', student: { id: 's2', code: 'AB-0190', name: 'جود' } }),
  linkView({ id: 'link-3', expires_at: '2026-10-01T00:00:00Z', student: { id: 's3', code: 'AB-0191', name: 'مريم' } }),
];

function show() {
  vi.stubEnv('VITE_FEATURE_STRIPE', '1');
  routeFetch(apiFetch, [
    ['/stripe/feature', { stripe: true }],
    ['/sales/payment-links', LINKS],
  ]);
  renderWithClient(<PaymentLinksSection />);
}

describe('«روابط الدفع» under «مدفوعاتي»', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('a normal build: nothing and no request', async () => {
    routeFetch(apiFetch, [['/stripe/feature', { stripe: true }]]);
    renderWithClient(<PaymentLinksSection />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('heading', { name: P.list })).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('her links: student, amount, kind, the status as it reads now, and the date', async () => {
    show();
    const table = await screen.findByRole('table', { name: P.list });
    expect(within(table).getByText('سهيلة')).toBeTruthy();
    expect(within(table).getAllByText(P.status.open)).toHaveLength(1);
    expect(within(table).getByText(P.status.paid)).toBeTruthy();
    // An open link past its expiry reads «منتهي» (effectiveLinkStatus).
    expect(within(table).getByText(P.status.expired)).toBeTruthy();
    expect(within(table).getByText(P.kind.renewal)).toBeTruthy();
    expect(within(table).getAllByRole('button', { name: new RegExp(P.cancel) })).toHaveLength(1);
  });

  it('«إلغاء الرابط» asks once more, then POSTs the cancel and reloads the list', async () => {
    show();
    apiSend.mockResolvedValue(linkView({ status: 'cancelled' }));
    fireEvent.click(await screen.findByRole('button', { name: `${P.cancel} — سهيلة` }));
    const dialog = screen.getByRole('dialog', { name: P.cancel });
    expect(within(dialog).getByText(P.cancelConfirm)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: P.cancel }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/payment-links/link-1/cancel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a link paid meanwhile (409 link_not_open) says so in the dialog', async () => {
    show();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'link_not_open' }));
    fireEvent.click(await screen.findByRole('button', { name: `${P.cancel} — سهيلة` }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: P.cancel }));
    expect(await screen.findByText(P.error.link_not_open)).toBeTruthy();
  });
});
