import { seatState, type SeatState } from '@ab/client-core';
import type { ReactNode } from 'react';
import { t } from '@/lib/i18n/i18n';
import { SeatChatButton } from './SeatChatButton';
import { TakeSeatButton } from './TakeSeatButton';
import { useChannelSeat, type ChannelSeatApi } from './use-channel-seat';

interface SeatRow {
  studentId: string;
  studentName: string;
}

interface SeatView extends SeatRow {
  seat: ChannelSeatApi;
  holder: string;
}

/** Mine → the chat; free, a former assistant's or my own student's → take it; else whose it is. */
const VIEW: Readonly<Record<SeatState, (v: SeatView) => ReactNode>> = {
  mine: (v) => <SeatChatButton studentId={v.studentId} studentName={v.studentName} seat={v.seat} />,
  take: (v) => <TakeSeatButton seat={v.seat} />,
  held: (v) => (
    <span className="text-sm text-ink-3">
      {t.studentChannel.seat.heldBy.replace('{name}', v.holder)}
    </span>
  ),
};

/**
 * The chat cell of «كل الطلاب» and «طلابي» (owner 2026-11-16: «any assistant can subscribe to the
 * chating channel but only 1», «who brought the student have the priority»): one assistant seat
 * per student chat. Empty while the seat loads or cannot be read.
 */
export function ChannelSeatCell(row: SeatRow) {
  const seat = useChannelSeat(row.studentId);
  const data = seat.query.data;
  if (!data) return null;
  return VIEW[seatState(data)]({ ...row, seat, holder: data.holder?.name ?? '' });
}
