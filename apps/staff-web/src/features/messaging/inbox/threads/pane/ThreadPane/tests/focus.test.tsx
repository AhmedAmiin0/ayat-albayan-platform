import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { detail, message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { ThreadPane } from '@/features/messaging/inbox/threads/pane/ThreadPane/ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({
  Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink,
}));

const threadCalls = () =>
  apiFetch.mock.calls.filter(([path]) => path === '/threads/%2B966501234567').length;

afterEach(() => {
  apiFetch.mockReset();
  vi.restoreAllMocks();
});

describe('the open chat after another window had focus (W13)', () => {
  it('no focus: no poll; the window gets focus back → /threads/:phone is fetched again', async () => {
    const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    routeFetch(apiFetch, [
      [
        '/threads/%2B966501234567',
        detail([message({ body: 'السلام عليكم' })], { session_open: true }),
      ],
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
      ['/settings', {}],
      ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ]);
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    await screen.findByRole('log', { name: t.messages.log });
    const before = threadCalls();
    expect(before).toBe(1);
    // visibilitychange never fires when she just clicks another window: focus brings it back.
    focus.mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(threadCalls()).toBe(before + 1));
  });
});
