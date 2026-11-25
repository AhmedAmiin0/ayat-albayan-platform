import { CHANNEL_SEAT_TAKEN, type ChannelSeat } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { ChannelRepo } from '@/modules/teaching/student-channels/channel.repo';
import { ChannelSeatRepo, type SeatRow } from './channel-seat.repo';

/**
 * The seat as `me` sees it: I may take it when it is free (a holder who is no longer an
 * assistant counts as free) or when I brought the student (the bringer comes first),
 * never when it is already mine.
 */
function seatView(row: SeatRow, me: string): ChannelSeat {
  const mine = row.holder?.id === me;
  const bringer = row.broughtBy === me;
  return { holder: row.holder, mine, bringer, canTake: !mine && (row.holder === null || bringer) };
}

/**
 * One assistant seat per student chat (any assistant may take it, one at a time): any assistant
 * reads it and takes a free one, the bringer takes it from anyone, the holder leaves it. The seat
 * is not sales ownership: it opens the chat only (ChannelAccess.assistant), never money, leads or
 * commission. Unknown student: 404.
 */
@Injectable()
export class ChannelSeatService {
  constructor(
    @Inject(ChannelSeatRepo) private readonly seats: ChannelSeatRepo,
    @Inject(ChannelRepo) private readonly channels: ChannelRepo,
  ) {}

  async view(me: string, studentId: string): Promise<ChannelSeat> {
    return seatView(await this.row(studentId), me);
  }

  /** Mine already: as is (idempotent). Held by another assistant and not my student: 409. */
  async take(me: string, studentId: string): Promise<ChannelSeat> {
    const row = await this.row(studentId);
    const seat = seatView(row, me);
    if (seat.mine) return seat;
    if (!seat.canTake) throw conflict(CHANNEL_SEAT_TAKEN);
    // The row exists from registration (trigger); opened here if it never ran.
    await this.channels.channelOf(studentId);
    await this.seats.take({ studentId, profileId: me, from: row.heldBy });
    const after = seatView(await this.row(studentId), me);
    // Another assistant took it between the read and the write.
    if (!after.mine) throw conflict(CHANNEL_SEAT_TAKEN);
    return after;
  }

  /** The holder frees the seat; idempotent (not mine: nothing changes). */
  async leave(me: string, studentId: string): Promise<void> {
    await this.row(studentId);
    await this.seats.leave({ studentId, profileId: me });
  }

  private async row(studentId: string): Promise<SeatRow> {
    const row = await this.seats.read(studentId);
    if (!row) throw notFound('student_not_found');
    return row;
  }
}
