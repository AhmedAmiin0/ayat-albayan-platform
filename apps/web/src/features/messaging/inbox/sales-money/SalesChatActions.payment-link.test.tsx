import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, PHONE } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { ThreadPane } from '../threads/pane/ThreadPane';
import { LINK_QUOTE } from './payment-link/link-dialog.fixture';
import { student } from './sales-money-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));

const FAMILY = { guardian_id: 'g-1', lead_id: null, lead_status: null, guardian_name: 'أم سهيلة' } as const;

function open(stripe: boolean) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([], FAMILY)],
    ['/messaging/templates', []],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ['/settings', {}],
    ['/sales/money/family', { students: [student({ status: 'active' })] }],
    ['/stripe/feature', { stripe }],
  ]);
  apiSend.mockResolvedValue(LINK_QUOTE);
  renderWithClient(
    <InboxModeContext.Provider value="sales">
      <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
    </InboxModeContext.Provider>,
  );
}

const asked = (path: string) => apiFetch.mock.calls.some(([p]) => String(p).startsWith(path));
const openMore = async () => fireEvent.click(await screen.findByRole('button', { name: t.common.more }));

describe('«رابط دفع» in a sales chat (docs/30, TEST BUILD ONLY)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    vi.unstubAllEnvs();
  });

  it('a normal build: no «رابط دفع», and /stripe/feature is never asked', async () => {
    open(true);
    await openMore();
    expect(screen.getByRole('button', { name: t.booking.courseDays })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.paymentLinks.action })).toBeNull();
    expect(asked('/stripe/feature')).toBe(false);
  });

  it('the test build with the API off: still none', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    open(false);
    await openMore();
    expect(asked('/stripe/feature')).toBe(true);
    expect(screen.queryByRole('button', { name: t.paymentLinks.action })).toBeNull();
  });

  it('both on: «رابط دفع» in «المزيد» opens its dialog', async () => {
    vi.stubEnv('VITE_FEATURE_STRIPE', '1');
    open(true);
    await openMore();
    fireEvent.click(await screen.findByRole('button', { name: t.paymentLinks.action }));
    expect(await screen.findByRole('dialog', { name: t.paymentLinks.title })).toBeTruthy();
  });
});
