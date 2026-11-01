import { Module } from '@nestjs/common';
import { RemindersDeps } from './reminders.deps';
import { RemindersJob } from './reminders.job';
import { RemindersRepo } from './reminders.repo';
import { RemindersSettings } from './reminders.settings';

/**
 * R-MSG-02 lesson reminders + the R-MOB-01 lesson_needs_confirmation push (docs/12 §7).
 * DB, PushService and NotificationPolicy are global; RemindersSettings reads the global settings store. Register in app.module.ts.
 */
@Module({ providers: [RemindersRepo, RemindersSettings, RemindersDeps, RemindersJob], exports: [RemindersJob] })
export class RemindersModule {}
