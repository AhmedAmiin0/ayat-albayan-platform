import type { NotificationRuleRow } from '@ab/shared';

/** The writable part of a row (updated_at is set by the database). */
export type RuleRowWrite = Pick<
  NotificationRuleRow,
  'key' | 'enabled' | 'channels' | 'timing' | 'number_id'
>;
