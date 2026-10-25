import { counted, type NotificationEntryView, type NotificationRuleView, type NotificationsOverview } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

// The catalogue's switches on the phone (docs/23b §4, docs/26b §6b m7), in words. Every v2 field is
// guarded: an APK on an older API (v1, no `rule`) or a newer API (an unknown blocker) never crashes.

const r = () => t.mobileNotificationRules;

const isObject = (v: unknown): v is object => typeof v === 'object' && v !== null;

/** The row's rule when the answer carries a usable one (v2); null = read-only. */
export function ruleOf(entry: Pick<NotificationEntryView, 'rule'>): NotificationRuleView | null {
  const rule: unknown = entry.rule;
  if (!isObject(rule)) return null;
  const enabled: unknown = Reflect.get(rule, 'enabled');
  const editable: unknown = Reflect.get(rule, 'editable');
  return typeof enabled === 'boolean' && typeof editable === 'boolean' ? (rule as NotificationRuleView) : null;
}

/** switch: on/off here; locked: «لا يمكن إيقافه»; none: nothing to switch (read-only, manual, v1). */
export type RowControl = { kind: 'switch'; enabled: boolean } | { kind: 'locked' } | { kind: 'none' };

export function controlOf(entry: NotificationEntryView, canManage: boolean): RowControl {
  const rule = ruleOf(entry);
  if (!canManage || !rule) return { kind: 'none' };
  if (entry.locked) return { kind: 'locked' };
  return rule.editable && !entry.manual ? { kind: 'switch', enabled: rule.enabled } : { kind: 'none' };
}

/** What a switch asks first: family ON names whom it reaches; essential OFF needs the typed word. */
export type ToggleAsk = 'plain' | 'family' | 'typed';

export function askOf(entry: Pick<NotificationEntryView, 'audience' | 'essential'>, next: boolean): ToggleAsk {
  if (next && (entry.audience === 'guardian' || entry.audience === 'lead')) return 'family';
  if (!next && entry.essential) return 'typed';
  return 'plain';
}

/**
 * «سيصل إلى N ولي أمر» from GET /admin/notifications `reach`, in the Arabic count form for N (1, 2,
 * 3–10, 11+; the web's familyOn forms); none yet says so; a missing count says it generally.
 */
export function reachLine(audience: NotificationEntryView['audience'], reach: NotificationsOverview['reach']): string {
  if (audience !== 'guardian' && audience !== 'lead') return '';
  const n: unknown = isObject(reach) ? Reflect.get(reach, audience) : undefined;
  if (typeof n !== 'number') return r().reach.unknown;
  return n === 0 ? r().reach.nobody : counted(r().reach[audience], n);
}

/** «لا يُرسل الآن: …» for a known blocker; an unknown one (a newer API) shows no reason. */
export function heldLine(entry: Pick<NotificationEntryView, 'blocker'>): string | null {
  const blocker: unknown = entry.blocker;
  const words: Record<string, string> = r().blockers;
  if (typeof blocker !== 'string' || !Object.hasOwn(words, blocker)) return null;
  return r().heldNow.replace('{reason}', words[blocker] ?? '');
}

/** «معتمد جزئيًا» when only some of its template variants are approved (v2 `approval`). */
export const partialLine = (entry: Pick<NotificationEntryView, 'approval'>): string | null =>
  entry.approval === 'some' ? r().partial : null;

/** The row's name, or null for a key this build does not know (the row is left out). */
export function nameOf(key: string): string | null {
  const entries: Record<string, { name: string } | undefined> = t.notificationCatalogue.entries;
  return Object.hasOwn(entries, key) ? (entries[key]?.name ?? null) : null;
}

/** PATCH /admin/notifications/:key errors in words (403, 428, 422 locked / not_editable / invalid). */
export function ruleErrorText(error: unknown): string {
  const e = r().errors;
  if (!(error instanceof ApiError)) return e.failed;
  if (error.status === 403) return e.forbidden;
  if (error.status === 428) return e.confirmation_required;
  const message: unknown = isObject(error.body) ? Reflect.get(error.body, 'message') : undefined;
  if (error.status === 422 && (message === 'locked' || message === 'not_editable' || message === 'invalid')) return e[message];
  return e.failed;
}

/** True when the API asked for the typed word (428 confirmation_required). */
export const needsTypedWord = (error: unknown): boolean => error instanceof ApiError && error.status === 428;
