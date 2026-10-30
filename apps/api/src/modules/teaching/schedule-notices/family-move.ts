import { Injectable, Logger } from '@nestjs/common';
import { isConfirmation } from '@/common/rules/confirmations';
import { NoticeGate } from './notice.gate';
import { isUpcoming } from './notice.plan';

/** A lesson move: its old and its new start (ISO). */
export interface Move {
  from: string;
  to: string;
}

/** The messages the move's write queues, and whether the family hears it by lesson_rescheduled. */
export interface FamilyMove<T> {
  familyNotice: boolean;
  messages: T[];
}

/**
 * ONE family WhatsApp per move (the owner's operator, 2026-10-30): lesson_rescheduled when the
 * family would get it (its row on, its template approved, the move still ahead), and then the
 * write's booking_confirmation* rows are dropped; otherwise those rows stay, the fallback
 * (template to template, never free text). Other rows are never touched. Pure.
 */
export function familyMove<T>(usable: boolean, messages: readonly T[]): FamilyMove<T> {
  if (!usable) return { familyNotice: false, messages: [...messages] };
  return { familyNotice: true, messages: messages.filter((m) => !isConfirmation(m)) };
}

/**
 * The one place that chooses how the family hears a move (one-lesson and series reschedule, a time
 * edit, a trial's new date). Asked before the write; the choice rides on the ScheduleChange, so
 * ScheduleNotices sends the family's lesson_rescheduled exactly when the confirmation was dropped.
 * The teacher's lesson_rescheduled does not depend on it. A failed read keeps the confirmation.
 */
@Injectable()
export class FamilyMoveNotice {
  private readonly log = new Logger(FamilyMoveNotice.name);

  constructor(private readonly gate: NoticeGate) {}

  async choose<T>(move: Move, messages: readonly T[], now = new Date()): Promise<FamilyMove<T>> {
    const at = { at: new Date(move.to), from: new Date(move.from) };
    if (!isUpcoming(at, now)) return familyMove(false, messages);
    return familyMove(await this.usable(), messages);
  }

  private async usable(): Promise<boolean> {
    try {
      return await this.gate.usable('lesson_rescheduled');
    } catch (e) {
      const why = e instanceof Error ? e.message : String(e);
      this.log.warn(`lesson_rescheduled gate unread, booking confirmation kept: ${why}`);
      return false;
    }
  }
}
