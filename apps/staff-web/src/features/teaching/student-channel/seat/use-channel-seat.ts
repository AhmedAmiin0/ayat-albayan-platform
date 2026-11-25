import { CHANNEL_REFRESH_MS, channelSeatKey, channelSeats } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';

// The assistant seat of a student chat (any assistant may take it, but only one at a time): its
// read and its two writes live in @ab/client-core, the same as the staff app's; this hook binds
// them to the web's API client.

const seats = channelSeats({ apiFetch, apiSend });

/** Each write re-reads the seat. */
export function useChannelSeat(studentId: string) {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: channelSeatKey(studentId) });
  const { take, leave } = seats.seatMutations(studentId, done);
  const query = useQuery(seats.seatQuery(studentId));
  return { query, take: useMutation(take), leave: useMutation(leave) };
}

export type ChannelSeatApi = ReturnType<typeof useChannelSeat>;

/**
 * While a chat is open (a row reads its seat once a minute): the seat read at once and then like
 * the thread, so a takeover by the student's bringer closes it and the row says who follows it.
 */
export function useSeatWatch(studentId: string) {
  useQuery({ ...seats.seatQuery(studentId), staleTime: 0, refetchInterval: CHANNEL_REFRESH_MS });
}
