import { Module } from '@nestjs/common';
import { FamilyMoveNotice } from './family-move';
import { NoticeGate } from './notice.gate';
import { ScheduleNoticesRepo } from './schedule-notices.repo';
import { NoticeDeps, ScheduleNotices } from './schedule-notices.service';

/**
 * The schedule-change notices (owner 2026-10-30): a lesson moved or cancelled, a course paused or
 * resumed → the teacher and the family. Listens on the global LessonEvents; PushService,
 * NotificationPolicy and MessageSender come from their global modules. FamilyMoveNotice is
 * exported: the lesson and booking writers ask it how a family hears a move (one message).
 */
@Module({
  providers: [FamilyMoveNotice, NoticeDeps, NoticeGate, ScheduleNotices, ScheduleNoticesRepo],
  exports: [FamilyMoveNotice],
})
export class ScheduleNoticesModule {}
