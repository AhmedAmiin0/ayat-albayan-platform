import type { Permission } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { meQuery, type Me } from '@/features/people/auth/me';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE } from '../../testing/inbox-fixture';
import { InboxModeContext, type InboxMode } from '../../shared/mode';
import { routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const READ_SEND: Permission[] = ['inbox.read', 'inbox.send', 'messages.read'];

function open(mode: InboxMode, permissions: Permission[], session_open = true) {
  routeFetch(apiFetch, [
    ['/threads/%2B966501234567', detail([message({ body: 'السلام عليكم' })], { session_open })],
    ['/messaging/templates', []],
    ['/messages/gate', { open: true, reason: null, queued: 0 }],
    ['/settings', {}],
    ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
  ]);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  // The shells load /auth/me before the page (requireRole): seeded the same way here.
  const me: Me = { id: 'u-1', email: null, role: mode === 'admin' ? 'admin' : 'sales', permissions };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <InboxModeContext.Provider value={mode}>
        <ThreadPane phone={PHONE} listSearch={{ page: 1 }} />
      </InboxModeContext.Provider>
    </QueryClientProvider>,
  );
}

const templateCalls = () => apiFetch.mock.calls.filter(([path]) => String(path).startsWith('/messaging/templates'));
const box = () => screen.queryByRole('textbox', { name: t.inbox.composer.messageLabel });

describe('the chat follows the editable sales role (W12)', () => {
  afterEach(() => apiFetch.mockReset());

  it('with every permission: the reply box, and the templates are read', async () => {
    open('sales', READ_SEND);
    await screen.findByText('السلام عليكم');
    expect(box()).toBeTruthy();
    expect(screen.queryByText(t.inbox.sendNotAllowed)).toBeNull();
    await vi.waitFor(() => expect(templateCalls().length).toBeGreaterThan(0));
  });

  it('inbox.send off: no textarea, the read-only line instead', async () => {
    open('sales', ['inbox.read', 'messages.read']);
    expect(await screen.findByText(t.inbox.sendNotAllowed)).toBeTruthy();
    expect(box()).toBeNull();
    expect(document.querySelector('textarea')).toBeNull();
  });

  it('messages.read off: no /messaging/templates request', async () => {
    open('sales', ['inbox.read', 'inbox.send']);
    await screen.findByText('السلام عليكم');
    expect(box()).toBeTruthy();
    expect(templateCalls()).toHaveLength(0);
  });

  it('messages.read off, window closed: the help line, no template form, no /messaging/templates request', async () => {
    open('sales', ['inbox.read', 'inbox.send'], false);
    // Round 2 J: the permission is what is missing, not a template.
    expect(await screen.findByText(t.inbox.composer.noPermissionHelp)).toBeTruthy();
    expect(screen.queryByText(t.inbox.composer.noAllowedHelp)).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.queryByRole('button', { name: t.inbox.composer.sendTemplate })).toBeNull();
    expect(templateCalls()).toHaveLength(0);
  });

  it('teacher mode follows the same rule', async () => {
    open('teacher', ['inbox.read']);
    expect(await screen.findByText(t.inbox.sendNotAllowed)).toBeTruthy();
    expect(templateCalls()).toHaveLength(0);
  });

  it('admin mode is unchanged: the reply box and the templates whatever the list says', async () => {
    open('admin', []);
    await screen.findByText('السلام عليكم');
    expect(box()).toBeTruthy();
    expect(screen.queryByText(t.inbox.sendNotAllowed)).toBeNull();
    await vi.waitFor(() => expect(templateCalls().length).toBeGreaterThan(0));
  });
});
