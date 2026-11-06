import { Module } from '@nestjs/common';
import { LessonLinksModule } from '@/modules/teaching/lesson-links';
import { RemindersJob } from './reminders.job';
import { RemindersRepo } from './reminders.repo';
import { RemindersSettings } from './reminders.settings';
import { ReminderTeacherLinks } from './reminders.teacher-links';

/**
 * R-MSG-02 lesson reminders + the R-MOB-01 lesson_needs_confirmation push (docs/12 §7).
 * DB, PushService and NotificationPolicy are global; RemindersSettings reads the global settings
 * store. Register in app.module.ts.
 */
@Module({
  imports: [LessonLinksModule],
  providers: [RemindersRepo, RemindersSettings, ReminderTeacherLinks, RemindersJob],
  exports: [RemindersJob],
})
export class RemindersModule {}
