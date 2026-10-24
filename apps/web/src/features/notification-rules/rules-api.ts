import { RULE_ERRORS, type NotificationEntryView, type RulePatchInput, type RuleError } from '@ab/shared';
import { ApiError, apiSend } from '@/lib/api';

/** Why a save failed: the contract's errors, or no permission, or anything else. */
export type RuleFailure = RuleError | 'forbidden' | 'failed';

/** The permission that edits a row (docs/23b §4); reading needs settings.read only. */
export const MANAGE_PERMISSION = 'notifications.manage';

/** Does the signed-in user hold notifications.manage? */
export function canManageNotifications(permissions: readonly string[]): boolean {
  return permissions.includes(MANAGE_PERMISSION);
}

/** PATCH /admin/notifications/:key with only the fields that changed; answers the updated row. */
export const patchRule = (input: { key: string; body: RulePatchInput }) =>
  apiSend<NotificationEntryView>('PATCH', `/admin/notifications/${encodeURIComponent(input.key)}`, input.body);

const isRuleError = (v: unknown): v is RuleError => typeof v === 'string' && (RULE_ERRORS as readonly string[]).includes(v);

/** 428 → confirmation_required; 422 → its message; 403 → forbidden; else failed. */
export function ruleFailure(error: unknown): RuleFailure {
  if (!(error instanceof ApiError)) return 'failed';
  if (error.status === 428) return 'confirmation_required';
  if (error.status === 403) return 'forbidden';
  const body = error.body;
  const message = body && typeof body === 'object' && 'message' in body ? body.message : undefined;
  if (error.status === 422) return isRuleError(message) ? message : 'invalid';
  return 'failed';
}
