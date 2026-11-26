import { notificationEntry, type NotificationKey } from '@ab/shared';
import type { AnyPushKind } from '@ab/catalog';
import type { RulesSnapshot } from '@/modules/messaging/notification-rules/store/rules.reader';
import { ruleOf } from '@/common/rules/rule-of';

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
export function pushRoute(snap: RulesSnapshot | null, kind: AnyPushKind): PushRoute {
  const key: NotificationKey = kind;
  if (!snap) return { bell: true, push: notificationEntry(key).locked };
  const rule = ruleOf(snap, key);
  if (!rule.enabled) return { bell: false, push: false };
  return { bell: true, push: rule.channels.includes('push') };
}
