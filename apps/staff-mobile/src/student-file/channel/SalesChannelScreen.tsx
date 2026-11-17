import { seatState } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, Button, ChannelScreen } from '@ab/mobile-kit';
import { SeatCard } from './SeatCard';
import { useChannelSeat } from './use-channel-seat';
import { useStaffChannelMedia } from './use-staff-channel-media';

/**
 * The assistant's view of a student chat (/sales/students/channel/:id; owner 2026-11-16 «any
 * assistant can subscribe to the chating channel but only 1»): hers → the chat, where she writes,
 * with «مغادرة المحادثة» in the header (the card then comes back) and the phone's pickers,
 * microphone and player; otherwise SeatCard.
 */
export function SalesChannelScreen() {
  const { id = '' } = useLocalSearchParams<{ id?: string }>();
  const seat = useChannelSeat(id);
  const media = useStaffChannelMedia();
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
  const title = t.studentChannel.monitorTitle;
  return <ChannelScreen refs={refs} title={title} media={media} trailing={leave} />;
}
