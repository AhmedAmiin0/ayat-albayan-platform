import { Module } from '@nestjs/common';
import { RemindersJob } from './reminders.job';
import { RemindersQueries } from './reminders.queries';

/**
 * R-MSG-02 lesson reminders + the R-MOB-01 lesson_needs_confirmation push (docs/12 §7).
 * DB, SettingsService and PushService are global. Register in app.module.ts.
 */
@Module({ providers: [RemindersQueries, RemindersJob], exports: [RemindersJob] })
export class RemindersModule {}
