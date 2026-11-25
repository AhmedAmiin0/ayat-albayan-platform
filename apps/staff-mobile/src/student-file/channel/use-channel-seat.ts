import { CHANNEL_REFRESH_MS, channelSeatKey, channelSeats } from '@ab/client-core';
import { apiFetch, apiSend, useScreenFocused } from '@ab/mobile-kit';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// The assistant seat of a student chat on the phone (any assistant,
// one at a time): the read and the writes are @ab/client-core's,
// the same as the web's. Re-read while the screen is shown, so a takeover by the student's
// bringer (who has priority) turns the chat into the card.

const seats = channelSeats({ apiFetch, apiSend });

export function useChannelSeat(studentId: string) {
  const focused = useScreenFocused();
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: channelSeatKey(studentId) });
  const { take, leave } = seats.seatMutations(studentId, done);
  const poll = focused ? CHANNEL_REFRESH_MS : false;
  const query = useQuery({ ...seats.seatQuery(studentId), refetchInterval: poll });
  return { query, take: useMutation(take), leave: useMutation(leave) };
}

export type ChannelSeatApi = ReturnType<typeof useChannelSeat>;
