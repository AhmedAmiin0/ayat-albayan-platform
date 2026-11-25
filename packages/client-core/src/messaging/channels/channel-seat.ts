import { CHANNEL_SEAT_TAKEN, channelSeatSchema, type ChannelSeat } from '@ab/shared';
import { apiErrorCode, type ApiClient } from '../../core/http/index.js';

// One assistant seat per student chat (any assistant may take it, one at a time; the one who
// brought the student has priority), the same for web and mobile: plain TanStack Query options
// (no React here); each app spreads them into its hooks.

/**
 * What an assistant sees for one student: hers (the chat opens), free to take, another
 * assistant's that she may take over (she brought the student), another's.
 */
export type SeatState = 'mine' | 'take' | 'takeover' | 'held';

/** Why a take failed: another assistant got there first (409), or anything else. */
type SeatError = 'taken' | 'failed';

/** A row reads its seat once a minute at most; lists read one seat per row. */
const SEAT_STALE_MS = 60_000;

type SeatKey = readonly ['channel', 'seat', string];

export const channelSeatKey = (studentId: string): SeatKey => ['channel', 'seat', studentId];

/** useQuery options for one student's seat. */
interface SeatQuery {
  queryKey: SeatKey;
  queryFn: () => Promise<ChannelSeat>;
  staleTime: number;
  retry: false;
}

/** useMutation options for one seat write; `onSettled` re-reads the seat. */
interface SeatMutation<T> {
  mutationFn: () => Promise<T>;
  onSettled: () => Promise<unknown>;
}

interface ChannelSeats {
  seatQuery: (studentId: string) => SeatQuery;
  seatMutations: (
    studentId: string,
    done: () => Promise<unknown>,
  ) => { take: SeatMutation<ChannelSeat>; leave: SeatMutation<void> };
}

const seatPath = (studentId: string): string =>
  `/sales/students/${encodeURIComponent(studentId)}/channel/seat`;

const parse = (r: unknown): ChannelSeat => channelSeatSchema.parse(r);

/** A former assistant's seat reads as free (holder null), so a holder here is a colleague. */
const takeState = (seat: ChannelSeat): SeatState => (seat.holder ? 'takeover' : 'take');

/** Mine → the chat; free → take it; my own student's, held → take it over; else whose it is. */
export function seatState(seat: ChannelSeat): SeatState {
  if (seat.mine) return 'mine';
  return seat.canTake ? takeState(seat) : 'held';
}

export const seatError = (e: unknown): SeatError =>
  apiErrorCode(e) === CHANNEL_SEAT_TAKEN ? 'taken' : 'failed';

/** The app's i18n `studentChannel` words that a failed take needs. */
interface SeatErrorWords {
  seat: { taken: string };
  actions: { failed: string };
}

const SEAT_ERROR_TEXT: Readonly<Record<SeatError, (words: SeatErrorWords) => string>> = {
  taken: (words) => words.seat.taken,
  failed: (words) => words.actions.failed,
};

/** The line under a failed take: another assistant got there first (409), or try again. */
export const seatErrorText = (e: unknown, words: SeatErrorWords): string =>
  SEAT_ERROR_TEXT[seatError(e)](words);

/** `done` re-reads the seat after a take-over or leave. */
export function channelSeats(client: ApiClient): ChannelSeats {
  const take = (studentId: string): Promise<ChannelSeat> =>
    client.apiSend('PUT', seatPath(studentId)).then(parse);
  const leave = (studentId: string): Promise<void> => client.apiSend('DELETE', seatPath(studentId));
  return {
    seatQuery: (studentId: string) => ({
      queryKey: channelSeatKey(studentId),
      queryFn: () => client.apiFetch(seatPath(studentId)).then(parse),
      staleTime: SEAT_STALE_MS,
      // A refusal or an odd answer is shown as no cell at once, never asked again per row.
      retry: false as const,
    }),
    seatMutations: (studentId: string, done: () => Promise<unknown>) => ({
      take: { mutationFn: () => take(studentId), onSettled: done },
      leave: { mutationFn: () => leave(studentId), onSettled: done },
    }),
  };
}
