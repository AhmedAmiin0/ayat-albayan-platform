import type { PushKind } from '../enums/index.js';
import type { Permission } from '../permissions/catalog.js';

/** What every bell row needs: the staff member reads their own notifications (R-NOT-01). */
const BELL: readonly Permission[] = ['notifications.push'];
/** An inbox event names a family and quotes their message: only for who may read the inbox. */
const INBOX: readonly Permission[] = ['notifications.push', 'inbox.read'];
/** The Google sync's own alerts (docs/24): for who may read the settings, i.e. admins. */
const SETTINGS: readonly Permission[] = ['notifications.push', 'settings.read'];

/**
 * The permissions a profile must hold, at send time, to get a notification of each kind (bell row,
 * browser and app alike). PushService checks them against the profile's effective permissions.
 */
export const PUSH_KIND_PERMISSIONS: Readonly<Record<PushKind, readonly Permission[]>> = {
  new_lead: INBOX,
  new_message: INBOX,
  reminder_failed: INBOX,
  lesson_needs_confirmation: BELL,
  report_submitted: BELL,
  payment_due: BELL,
  new_student: BELL,
  meeting_invite: BELL,
  google_sync_alert: SETTINGS,
  channel_message: BELL,
};

/** May a profile holding `held` be told about `kind`? */
export function mayReceivePush(kind: PushKind, held: readonly string[]): boolean {
  return PUSH_KIND_PERMISSIONS[kind].every((p) => held.includes(p));
}
