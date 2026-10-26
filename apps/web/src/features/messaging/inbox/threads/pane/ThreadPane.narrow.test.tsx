import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth/me';
import { SETTINGS } from '@/test/settings-fixture';
import { t } from '@/lib/i18n/i18n';
import { detail, lead, message, PHONE, template } from '../../testing/inbox-fixture';
import { InboxModeContext } from '../../shared/mode';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

/** A window this wide in px: each (max-width: Nrem) query answers as the browser would (1rem = 16px). */
function viewport(px: number) {
  const query = (media: string) => {
    const rem = Number(/max-width:\s*([\d.]+)rem/.exec(media)?.[1] ?? 'NaN');
    return { matches: px <= rem * 16, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  };
  vi.stubGlobal('matchMedia', vi.fn(query));
}

function renderThread() {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([message()])],
    ['/messaging/templates', [template()]],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', SETTINGS],
    ['/leads?', { items: [lead()], total: 1, page: 1, pageSize: 5 }],
  ]);
  renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
}

describe('ThreadPane below 900px (a half-screen window, a tablet): the full-screen chat (W4)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('at 800px: [data-testid=phone-chat] with the compact header, the log and the composer inside it', async () => {
    viewport(800);
    renderThread();
    const chat = await screen.findByTestId('phone-chat');
    expect(matchMedia).toHaveBeenCalledWith('(max-width: 56.24rem)');
    expect(within(chat).getByRole('log', { name: t.messages.log })).toBeTruthy();
    expect(within(chat).getByRole('heading', { level: 2, name: 'أم سهيلة' })).toBeTruthy();
    const box = await within(chat).findByRole('textbox', { name: t.inbox.composer.messageLabel });
    expect(chat.contains(box)).toBe(true);
    // The lead panel moves into the header's sheet instead of sitting under the log.
    expect(screen.queryByRole('complementary', { name: t.inbox.leadPanel })).toBeNull();
    expect(within(chat).getByRole('button', { name: t.inbox.leadSheet })).toBeTruthy();
  });

  it('from 900px: the wide thread, no full-screen chat', async () => {
    viewport(1024);
    renderThread();
    expect(await screen.findByRole('log', { name: t.messages.log })).toBeTruthy();
    expect(screen.queryByTestId('phone-chat')).toBeNull();
  });

  it('at 800px without inbox.send (sales): the read-only line takes the full-screen chat’s padding', async () => {
    viewport(800);
    routeFetch(apiFetch, [
      ['/threads/%2B966501234567', detail([message()])],
      ['/messaging/templates', []],
    ]);
    // The shells load /auth/me first (requireRole): seeded the same way here.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const me: Me = { id: 'u-1', email: null, role: 'sales', permissions: ['inbox.read', 'messages.read'] };
    client.setQueryData(meQuery.queryKey, me);
    render(
      <QueryClientProvider client={client}>
        <InboxModeContext.Provider value="sales">
          <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
        </InboxModeContext.Provider>
      </QueryClientProvider>,
    );
    const line = await screen.findByText(t.inbox.sendNotAllowed);
    expect(within(screen.getByTestId('phone-chat')).getByText(t.inbox.sendNotAllowed)).toBe(line);
    expect(line.className).toContain('max-shell:px-3');
    expect(line.className).not.toContain('max-sm:');
  });
});
