import { channelSeatKey, channelSeats } from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';

// The assistant seat of a student chat (owner 2026-11-16 «any assistant can subscribe to the
// chating channel but only 1»): its read and its two writes live in @ab/client-core, the same as
// the staff app's; this hook binds them to the web's API client.

const seats = channelSeats({ apiFetch, apiSend });

/** One student's seat, «تولَّ المحادثة» and «مغادرة المحادثة»; each write re-reads the seat. */
export function useChannelSeat(studentId: string) {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: channelSeatKey(studentId) });
  const { take, leave } = seats.seatMutations(studentId, done);
  const query = useQuery(seats.seatQuery(studentId));
  return { query, take: useMutation(take), leave: useMutation(leave) };
}

export type ChannelSeatApi = ReturnType<typeof useChannelSeat>;
