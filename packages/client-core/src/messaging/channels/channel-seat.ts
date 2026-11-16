import { CHANNEL_SEAT_TAKEN, channelSeatSchema, type ChannelSeat } from '@ab/shared';
import { apiErrorCode, type ApiClient } from '../../core/http/index.js';

// One assistant seat per student chat (owner 2026-11-16 «any assistant can subscribe to the
// chating channel but only 1»; «who brought the student have the priority»), the same for web and
// mobile: plain TanStack Query options (no React here); each app spreads them into its hooks.

/** What an assistant sees for one student: hers (the chat opens), hers to take, another's. */
export type SeatState = 'mine' | 'take' | 'held';

/** Why a take failed: another assistant got there first (409), or anything else. */
export type SeatError = 'taken' | 'failed';

/**
 * A row reads its seat once a minute at most: «كل الطلاب» and «طلابي» read one seat per row.
 * ponytail: one GET per row; put the seat in the list rows if a page feels slow.
 */
const SEAT_STALE_MS = 60_000;

export const channelSeatKey = (studentId: string) => ['channel', 'seat', studentId] as const;

const seatPath = (studentId: string): string =>
  `/sales/students/${encodeURIComponent(studentId)}/channel/seat`;

const parse = (r: unknown): ChannelSeat => channelSeatSchema.parse(r);

/** Mine → the chat; free, a former assistant's or my own student's → take it; else whose it is. */
export function seatState(seat: ChannelSeat): SeatState {
  if (seat.mine) return 'mine';
  return seat.canTake ? 'take' : 'held';
}

export const seatError = (e: unknown): SeatError =>
  apiErrorCode(e) === CHANNEL_SEAT_TAKEN ? 'taken' : 'failed';

/**
 * The seat's read and its two writes, bound to an app's API client. `seatMutations(id, done)`:
 * useMutation options for «تولَّ المحادثة» and «مغادرة المحادثة»; `done` re-reads the seat.
 */
export function channelSeats(client: ApiClient) {
  const take = (studentId: string) => client.apiSend('PUT', seatPath(studentId)).then(parse);
  const leave = (studentId: string) => client.apiSend('DELETE', seatPath(studentId));
  return {
    seatQuery: (studentId: string) => ({
      queryKey: channelSeatKey(studentId),
      queryFn: () => client.apiFetch(seatPath(studentId)).then(parse),
      staleTime: SEAT_STALE_MS,
    }),
    seatMutations: (studentId: string, done: () => Promise<unknown>) => ({
      take: { mutationFn: () => take(studentId), onSettled: done },
      leave: { mutationFn: () => leave(studentId), onSettled: done },
    }),
  };
}
