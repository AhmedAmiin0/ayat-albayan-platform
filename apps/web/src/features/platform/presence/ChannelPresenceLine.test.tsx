import type { ChannelPresence } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ChannelPresenceLine } from './ChannelPresenceLine';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@/lib/http/supabase', () => ({ supabase: {} }));
interface WatchInput {
  profileIds: string[];
  onChange: (w: unknown) => void;
}
/** The socket: the test says who is present (live) or that Realtime never answered. */
const socket = vi.hoisted(() => ({ online: null as string[] | null, ids: [] as string[] }));
vi.mock('@ab/client-core', async (orig) => ({
  ...(await orig<object>()),
  watchPresence: (_client: unknown, input: WatchInput) => {
    socket.ids = input.profileIds;
    if (socket.online) input.onChange({ live: true, online: new Set(socket.online) });
    return () => undefined;
  },
}));

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
const answer = (over: Partial<ChannelPresence> = {}): ChannelPresence => ({
  enabled: true,
  peers: [
    { profile_id: 't1', role: 'teacher', last_seen_at: minutesAgo(10) },
    { profile_id: 't2', role: 'teacher', last_seen_at: minutesAgo(40) },
  ],
  ...over,
});
const show = (body: ChannelPresence) => {
  apiFetch.mockResolvedValue(body);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ChannelPresenceLine chat={{ audience: 'portal', studentId: 's1' }} tz="Asia/Riyadh" now={new Date()} />
    </QueryClientProvider>,
  );
};
const p = t.presence;

describe('ChannelPresenceLine: the student channel header (docs/33)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    Object.assign(socket, { online: null, ids: [] });
  });

  it('anyone online: the dot and «متصل الآن»; watches the peers it was given', async () => {
    socket.online = ['t2'];
    show(answer());
    expect(await screen.findByText(p.online)).toBeTruthy();
    expect(socket.ids).toEqual(['t1', 't2']);
    expect(apiFetch).toHaveBeenCalledWith('/portal/students/s1/channel/presence');
  });

  it('nobody online: «آخر ظهور» of the most recently seen peer', async () => {
    show(answer());
    const when = p.minutes.few.replace('{n}', '10');
    expect(await screen.findByText(p.lastSeen.replace('{when}', when))).toBeTruthy();
    expect(screen.queryByText(p.online)).toBeNull();
  });

  it('presence off, no peers or never seen: nothing at all', async () => {
    for (const body of [
      answer({ enabled: false, peers: [] }),
      answer({ peers: [] }),
      answer({ peers: [{ profile_id: 't1', role: 'teacher', last_seen_at: null }] }),
    ]) {
      const { container, unmount } = show(body);
      await waitFor(() => expect(apiFetch).toHaveBeenCalled());
      expect(container.textContent).toBe('');
      unmount();
      apiFetch.mockReset();
    }
  });
});
