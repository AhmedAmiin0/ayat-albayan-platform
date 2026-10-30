import { Module } from '@nestjs/common';
import { ScheduleNoticesRepo } from './schedule-notices.repo';
import { NoticeDeps, ScheduleNotices } from './schedule-notices.service';

/**
 * The schedule-change notices (owner 2026-10-30): a lesson moved or cancelled, a course paused or
 * resumed → the teacher and the family. Listens on the global LessonEvents; PushService,
 * NotificationPolicy and MessageSender come from their global modules.
 */
@Module({ providers: [NoticeDeps, ScheduleNotices, ScheduleNoticesRepo] })
export class ScheduleNoticesModule {}
