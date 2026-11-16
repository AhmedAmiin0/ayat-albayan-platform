import type { ChannelSeat } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiClient } from '../../core/http/index.js';
import { channelSeatKey, channelSeats, seatError, seatState } from './channel-seat.js';

// Owner 2026-11-16 «any assistant can subscribe to the chating channel but only 1» and «who
// brought the student have the priority»: the seat both apps read and write.

const HELD: ChannelSeat = {
  holder: { id: 'p-b', name: 'هدى' },
  mine: false,
  bringer: false,
  canTake: false,
};
const apiFetch = vi.fn(async (_path: string): Promise<unknown> => HELD);
const apiSend = vi.fn(async (_method: string, _path: string): Promise<unknown> => ({
  ...HELD,
  mine: true,
}));
const seats = channelSeats({ apiFetch, apiSend } as unknown as ApiClient);

describe('channelSeats', () => {
  it('reads one seat per student under its own key, parsed', async () => {
    const q = seats.seatQuery('s1');
    expect(q.queryKey).toEqual(channelSeatKey('s1'));
    expect(q.queryKey).toEqual(['channel', 'seat', 's1']);
    await expect(q.queryFn()).resolves.toEqual(HELD);
    expect(apiFetch).toHaveBeenCalledWith('/sales/students/s1/channel/seat');
    apiFetch.mockResolvedValueOnce({ holder: 'nope' });
    await expect(q.queryFn()).rejects.toThrow();
  });

  it('take is a PUT, leave a DELETE; both re-read the seat when settled', async () => {
    const done = vi.fn(async () => undefined);
    const { take, leave } = seats.seatMutations('s1', done);
    await expect(take.mutationFn()).resolves.toMatchObject({ mine: true });
    expect(apiSend).toHaveBeenCalledWith('PUT', '/sales/students/s1/channel/seat');
    await leave.mutationFn();
    expect(apiSend).toHaveBeenLastCalledWith('DELETE', '/sales/students/s1/channel/seat');
    expect([take.onSettled, leave.onSettled]).toEqual([done, done]);
  });
});

describe('seatState and seatError', () => {
  it('mine → the chat; free or my student → take; another assistant\'s → held', () => {
    expect(seatState({ ...HELD, holder: { id: 'me', name: 'سارة' }, mine: true })).toBe('mine');
    expect(seatState({ ...HELD, holder: null, canTake: true })).toBe('take');
    expect(seatState({ ...HELD, bringer: true, canTake: true })).toBe('take');
    expect(seatState(HELD)).toBe('held');
  });

  it('a 409 channel_seat_taken is «taken»; anything else failed', () => {
    expect(seatError(new ApiError(409, { code: 'channel_seat_taken' }))).toBe('taken');
    expect(seatError(new ApiError(500, null))).toBe('failed');
    expect(seatError(new TypeError('offline'))).toBe('failed');
  });
});
