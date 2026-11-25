import type { ChannelSeat } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../../core/http';
import { channelSeatKey, channelSeats, seatError, seatErrorText, seatState } from './channel-seat';

// One assistant seat per chat, the one who brought the student first: the seat both apps read
// and write.

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
const seats = channelSeats({ apiFetch, apiSend });

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
  it('mine → the chat; free → take; my student held → take over; another\'s → held', () => {
    expect(seatState({ ...HELD, holder: { id: 'me', name: 'سارة' }, mine: true })).toBe('mine');
    expect(seatState({ ...HELD, holder: null, canTake: true })).toBe('take');
    expect(seatState({ ...HELD, holder: null, bringer: true, canTake: true })).toBe('take');
    expect(seatState({ ...HELD, bringer: true, canTake: true })).toBe('takeover');
    expect(seatState(HELD)).toBe('held');
  });

  it('a 409 channel_seat_taken is «taken»; anything else failed', () => {
    expect(seatError(new ApiError(409, { code: 'channel_seat_taken' }))).toBe('taken');
    expect(seatError(new ApiError(500, null))).toBe('failed');
    expect(seatError(new TypeError('offline'))).toBe('failed');
  });

  it('seatErrorText: the app\'s words for «taken» or for a failed write', () => {
    const words = { seat: { taken: 'taken first' }, actions: { failed: 'try again' } };
    expect(seatErrorText(new ApiError(409, { code: 'channel_seat_taken' }), words)).toBe('taken first');
    expect(seatErrorText(new TypeError('offline'), words)).toBe('try again');
  });
});
