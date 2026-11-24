import { seatState } from '@ab/client-core';
import { useLocalSearchParams } from 'expo-router';
import { t, Button, ChannelScreen } from '@ab/mobile-kit';
import { SeatCard } from './SeatCard';
import { useChannelSeat } from './use-channel-seat';
import { useStaffChannelMedia } from './media/use-staff-channel-media';

/** Only one assistant holds a student chat's seat; hers opens the chat, otherwise the seat card. */
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
