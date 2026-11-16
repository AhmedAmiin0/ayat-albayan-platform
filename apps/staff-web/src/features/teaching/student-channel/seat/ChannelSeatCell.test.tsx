import type { ChannelSeat } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { channelPage } from '@/features/teaching/student-channel/channel.fixtures';
import { ChannelSeatCell } from './ChannelSeatCell';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// Owner 2026-11-16 «any assistant can subscribe to the chating channel but only 1» and «who
// brought the student have the priority»: the chat cell of «كل الطلاب» and «طلابي».
const S = t.studentChannel.seat;
const SEAT = '/sales/students/s1/channel/seat';
const free: ChannelSeat = { holder: null, mine: false, bringer: false, canTake: true };
const mine: ChannelSeat = { holder: { id: 'p-a', name: 'سارة' }, mine: true, bringer: false, canTake: false };

function show(seat: ChannelSeat) {
  apiFetch.mockImplementation(async (path: string) => (path === SEAT ? seat : channelPage()));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <ChannelSeatCell studentId="s1" studentName="سلمى" />
    </QueryClientProvider>,
  );
}

describe('ChannelSeatCell', () => {
  afterEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('held by another assistant: who follows it, no button', async () => {
    show({ ...free, holder: { id: 'p-b', name: 'هدى' }, canTake: false });
    expect(await screen.findByText(S.heldBy.replace('{name}', 'هدى'))).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('free: «تولَّ المحادثة» takes it (PUT) and the row then opens the chat', async () => {
    show(free);
    apiSend.mockImplementation(async () => {
      apiFetch.mockImplementation(async (path: string) => (path === SEAT ? mine : channelPage()));
      return mine;
    });
    fireEvent.click(await screen.findByRole('button', { name: S.take }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PUT', SEAT));
    expect(await screen.findByRole('button', { name: t.studentChannel.open })).toBeTruthy();
  });

  it('taken first by another assistant (409): says so', async () => {
    show(free);
    apiSend.mockRejectedValue(new ApiError(409, { code: 'channel_seat_taken' }));
    fireEvent.click(await screen.findByRole('button', { name: S.take }));
    expect((await screen.findByRole('alert')).textContent).toBe(S.taken);
  });

  it('mine: the chat opens with «مغادرة المحادثة», which frees the seat (DELETE)', async () => {
    show(mine);
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(await screen.findByRole('button', { name: t.studentChannel.open }));
    expect(await screen.findByText('غدًا إن شاء الله')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.leave }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('DELETE', SEAT));
  });
});
