import { seatState } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, Button, ChannelScreen } from '@ab/mobile-kit';
import { SeatCard } from './SeatCard';
import { useChannelSeat } from './use-channel-seat';

/**
 * The assistant's view of a student chat (/sales/students/channel/:id; owner 2026-11-16 «any
 * assistant can subscribe to the chating channel but only 1»): hers → the chat, where she writes,
 * with «مغادرة المحادثة» in the header (the card then comes back); otherwise SeatCard.
 */
export function SalesChannelScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const seat = useChannelSeat(id);
  const { data } = seat.query;
  if (!data || seatState(data) !== 'mine') return <SeatCard seat={seat} />;
  const leave = (
    <Button
      variant="ghost"
      label={t.studentChannel.seat.leave}
      busy={seat.leave.isPending}
      onPress={() => seat.leave.mutate()}
    />
  );
  const refs = { audience: 'sales', studentId: id } as const;
  return <ChannelScreen refs={refs} title={t.studentChannel.monitorTitle} trailing={leave} />;
}
