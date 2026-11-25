import { seatState } from '@ab/client-core';
import { Dialog, t } from '@ab/web-kit';
import { ChannelSeatCell } from './ChannelSeatCell';
import { SeatChatDialog } from './SeatChatDialog';
import { useChannelSeat } from './use-channel-seat';

interface OpenSeatChatProps {
  studentId: string;
  onClose: () => void;
}

/**
 * A chat notification's way in (/sales/students?student=<id>): that student's
 * chat opens over the list while the seat is hers; not hers (any more, a takeover included), a
 * short card says who follows it or offers to take it. Closing either clears the link.
 */
export function OpenSeatChat({ studentId, onClose }: OpenSeatChatProps) {
  const seat = useChannelSeat(studentId);
  const data = seat.query.data;
  if (!data) return null;
  return seatState(data) === 'mine' ? (
    <SeatChatDialog studentId={studentId} studentName="" seat={seat} onClose={onClose} />
  ) : (
    <Dialog compact title={t.studentChannel.monitorTitle} onClose={onClose}>
      <ChannelSeatCell studentId={studentId} studentName="" />
    </Dialog>
  );
}
