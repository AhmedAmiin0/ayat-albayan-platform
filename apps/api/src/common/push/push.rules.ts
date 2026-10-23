import { notificationEntry, type NotificationKey, type PushKind } from '@ab/shared';
import type { RulesSnapshot } from '../../modules/notification-rules/rules.reader';
import { ruleOf } from '../rules/rule-of';

/** Each push kind's catalogue row (docs/23a §B3 P1–P8; catalogue.test.ts keeps them in step). */
const ROW_OF: Record<PushKind, NotificationKey> = {
  new_lead: 'new_lead',
  new_message: 'new_message',
  lesson_needs_confirmation: 'lesson_needs_confirmation',
  report_submitted: 'report_submitted',
  reminder_failed: 'reminder_failed',
  payment_due: 'payment_due',
  new_student: 'new_student',
  meeting_invite: 'meeting_invite',
  google_sync_alert: 'google_sync_alert',
};

/** Where a staff notification goes: the bell row (push_notifications), and the browser / app push. */
export interface PushRoute {
  bell: boolean;
  push: boolean;
}

/**
 * The row's notification rule (docs/23 §2c): off → nothing at all; on without 'push' among its
 * channels → the bell row only. Rules unreadable (null snapshot): the bell row still (an alert is never
 * lost), no device push; a locked row (reminder_failed) keeps both. Pure.
 */
export function pushRoute(snap: RulesSnapshot | null, kind: PushKind): PushRoute {
  const key = ROW_OF[kind];
  if (!snap) return { bell: true, push: notificationEntry(key).locked };
  const rule = ruleOf(snap, key);
  if (!rule.enabled) return { bell: false, push: false };
  return { bell: true, push: rule.channels.includes('push') };
}
