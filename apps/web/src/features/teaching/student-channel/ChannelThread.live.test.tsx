import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from './channel.fixtures';
import { ChannelThread } from './ChannelThread';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
/** A fake Supabase Realtime channel: the test fires the join and an insert. */
const rt = vi.hoisted(() => {
  const fired: { status?: (s: string) => void; insert?: () => void; filter?: unknown } = {};
  const ch = {
    on: (_t: string, filter: unknown, cb: () => void) => Object.assign(fired, { filter, insert: cb }) && ch,
    subscribe: (cb: (s: string) => void) => Object.assign(fired, { status: cb }) && ch,
  };
  return { fired, channel: vi.fn(() => ch), removeChannel: vi.fn(async () => 'ok') };
});
vi.mock('@/lib/http/supabase', () => ({ supabase: { channel: rt.channel, removeChannel: rt.removeChannel } }));

const c = t.studentChannel;
const show = (audience: 'teacher' | 'portal' | 'admin') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ChannelThread refs={{ audience, studentId: 's1' }} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );

describe('ChannelThread: closed until the subscription, live over the socket (owner 2026-10-29)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
    rt.channel.mockClear();
  });

  it('closed: only «تُفتح المحادثة مع المعلم بعد الاشتراك», no composer, no socket, nothing marked read', async () => {
    apiFetch.mockResolvedValue(channelPage({ open: false, messages: [], channel_id: 'c1' }));
    show('portal');
    expect((await screen.findByText(c.closed)).getAttribute('role')).toBe('status');
    expect(screen.queryByLabelText(c.messageLabel)).toBeNull();
    expect(rt.channel).not.toHaveBeenCalled();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('open: the composer; the socket joins this channel and an insert re-reads the thread', async () => {
    apiFetch.mockResolvedValue(channelPage({ channel_id: 'c1' }));
    apiSend.mockResolvedValue({});
    show('teacher');
    expect(await screen.findByLabelText(c.messageLabel)).toBeTruthy();
    await waitFor(() => expect(rt.channel).toHaveBeenCalled());
    expect(rt.fired.filter).toMatchObject({ table: 'channel_messages', filter: 'channel_id=eq.c1' });
    rt.fired.status?.('SUBSCRIBED');
    const before = apiFetch.mock.calls.length;
    rt.fired.insert?.();
    await waitFor(() => expect(apiFetch.mock.calls.length).toBeGreaterThan(before));
  });

  it('a monitor of a closed channel still reads, told why the others cannot write', async () => {
    apiFetch.mockResolvedValue(channelPage({ open: false, read_only: true, channel_id: 'c1' }));
    show('admin');
    expect(await screen.findByText(`${c.readOnly} ${c.closedMonitor}`)).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
