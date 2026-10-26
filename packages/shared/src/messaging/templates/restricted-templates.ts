import type { Permission } from '../../permissions/catalog.js';
import type { TemplateView } from './template-views.js';

// Owner 2026-10-12 («all roles except the ones allowed to have all templates»): every role without
// templates.manage or templates.send_all (teachers in teacher mode, sales, the classroom assistant, a
// custom role) lists and sends only the restricted allow-list: the message_templates rows flagged
// `sales_starter` (the column kept its name; it now means «allowed for restricted roles», docs/16).

/**
 * Flagged by the chat line's import (template-import.ts); any other import comes unflagged. trial_reschedule
 * (owner 2026-10-18: «one more template to reschedule the meeting») is seeded by migration 460.
 */
export const RESTRICTED_TEMPLATE_DEFAULTS = ['free_trial_invite', 'welcome_greeting', 'trial_reschedule'] as const;

/** Sent only by their own button (signed link, picked lesson): never from a composer's picker. */
export const OWN_BUTTON_TEMPLATES: readonly string[] = ['lesson_feedback_request', 'lesson_join_link', 'lesson_rating'];

/** The permissions that lift the allow-list: every template, as the admin. */
export const ALL_TEMPLATES_PERMISSIONS = ['templates.manage', 'templates.send_all'] as const satisfies readonly Permission[];

/**
 * Owner 2026-10-15 («only allowed templates should be listed to the assistants») and 2026-10-18 («dont show
 * all these templates to sales/teacher»): a role based on sales, the classroom assistant or teacher lists
 * and sends only the allow-list, whatever it was granted.
 */
export const ALLOW_LIST_ONLY_ROLES: readonly string[] = ['sales', 'assistant', 'teacher'];

/** The signed-in user as the rule reads it: base role (profiles.role) and effective permissions. */
export interface TemplateSender {
  role?: string | null;
  permissions?: readonly string[] | null;
}

/** Does this user send every template? Otherwise only the allow-list (restrictedMay). */
export function sendsAllTemplates(who: TemplateSender | null | undefined): boolean {
  if (!who || (who.role && ALLOW_LIST_ONLY_ROLES.includes(who.role))) return false;
  const held = who.permissions ?? [];
  return ALL_TEMPLATES_PERMISSIONS.some((p) => held.includes(p));
}

/**
 * May this user manage the registry (sync, submit, move, the allow-list, the lines check)? templates.manage,
 * never a role based on sales, the classroom assistant or teacher, whatever it holds (owner 2026-10-18).
 */
export function managesTemplates(who: TemplateSender | null | undefined): boolean {
  if (!who || (who.role && ALLOW_LIST_ONLY_ROLES.includes(who.role))) return false;
  return (who.permissions ?? []).includes('templates.manage');
}

export type RestrictedCheck = Pick<TemplateView, 'key' | 'status' | 'sales_starter' | 'header_format'>;

/**
 * May a restricted role list or send this template? Approved, flagged by the admin, never a PDF one,
 * never an own-button one. The one rule behind both GET /messaging/templates and the thread send.
 */
export function restrictedMay(t: RestrictedCheck): boolean {
  return t.status === 'approved' && t.sales_starter && t.header_format !== 'document' && !OWN_BUTTON_TEMPLATES.includes(t.key);
}
