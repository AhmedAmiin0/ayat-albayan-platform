import { seatState } from '@ab/client-core';
import { SeatChatDialog } from './SeatChatDialog';
import { useChannelSeat } from './use-channel-seat';

interface OpenSeatChatProps {
  studentId: string;
  onClose: () => void;
}

/**
 * A chat notification's way in (/sales/students?student=<id>; owner 2026-11-16): that student's
 * chat opens over the list while the seat is hers; closing it clears the link. Not hers (any
 * more): nothing opens.
 */
export function OpenSeatChat({ studentId, onClose }: OpenSeatChatProps) {
  const seat = useChannelSeat(studentId);
  const data = seat.query.data;
  if (!data || seatState(data) !== 'mine') return null;
  return <SeatChatDialog studentId={studentId} studentName="" seat={seat} onClose={onClose} />;
}
