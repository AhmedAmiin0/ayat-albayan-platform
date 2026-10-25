import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { detail, message, PHONE } from '../../testing/inbox-fixture';
import { renderWithClient, routeFetch } from '../../testing/test-utils';
import { ThreadPane } from './ThreadPane';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../../testing/test-utils')).MockLink }));

const threadCalls = () => apiFetch.mock.calls.filter(([path]) => path === '/threads/%2B966501234567').length;

afterEach(() => {
  apiFetch.mockReset();
  vi.restoreAllMocks();
});

describe('the open chat after another window had focus (W13)', () => {
  it('no focus: no poll; the window gets focus back → /threads/:phone is fetched again', async () => {
    const focus = vi.spyOn(document, 'hasFocus').mockReturnValue(false);
    routeFetch(apiFetch, [
      ['/threads/%2B966501234567', detail([message({ body: 'السلام عليكم' })], { session_open: true })],
      ['/messaging/templates', []],
      ['/messages/gate', { open: true, reason: null, queued: 0 }],
      ['/settings', {}],
      ['/leads?', { items: [], total: 0, page: 1, pageSize: 5 }],
    ]);
    renderWithClient(<ThreadPane phone={PHONE} listSearch={{ page: 1 }} />);
    await screen.findByRole('log', { name: t.messages.log });
    const before = threadCalls();
    expect(before).toBe(1);
    // visibilitychange never fires when she only clicks another window: the focus event brings it back.
    focus.mockReturnValue(true);
    window.dispatchEvent(new Event('focus'));
    await waitFor(() => expect(threadCalls()).toBe(before + 1));
  });
});
