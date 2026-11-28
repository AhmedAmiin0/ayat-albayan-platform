import type { TemplateKey } from '@ab/shared';
import type { ReminderRules } from './reminders.rules';

/** The templates this tick could use, so the registry is asked only for those. */
export function wantedTemplates(
  rules: Pick<ReminderRules, 'dayBefore' | 'joinLink'>,
  livekit: boolean,
): TemplateKey[] {
  const wanted: TemplateKey[] = [];
  if (rules.dayBefore) wanted.push('lesson_reminder_24h');
  if (livekit && rules.joinLink) wanted.push('lesson_join_link');
  return wanted;
}
