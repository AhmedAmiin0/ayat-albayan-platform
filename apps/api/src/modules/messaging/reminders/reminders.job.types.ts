import type { ReminderLesson } from './plan/reminders.plan.types';
import type { ReminderRules } from './plan/reminders.rules';
import type { RemindersSettingsValues } from './reminders.settings';

export interface ReminderSummary {
  lessons: number;
  queued: number;
  dropped: number;
  pushed: number;
}

export interface QueueInput {
  settings: RemindersSettingsValues;
  rules: ReminderRules;
  lessons: readonly ReminderLesson[];
  now: Date;
  /** The web origin the classroom links are built on. */
  origin: string;
}
