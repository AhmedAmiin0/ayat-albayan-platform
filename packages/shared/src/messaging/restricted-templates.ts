import type { Permission } from '../permissions/catalog.js';
import type { TemplateView } from './template-views.js';

// Owner 2026-10-12 («all roles except the ones allowed to have all templates»): every role without
// templates.manage or templates.send_all (teachers in teacher mode, sales, the classroom assistant, a
// custom role) lists and sends only the restricted allow-list: the message_templates rows flagged
// `sales_starter` (the column kept its name; it now means «allowed for restricted roles», docs/16).

/** Flagged by the chat line's import (template-import.ts); any other import comes unflagged. */
export const RESTRICTED_TEMPLATE_DEFAULTS = ['free_trial_invite', 'welcome_greeting'] as const;

/** Sent only by their own button (signed link, picked lesson): never from a composer's picker. */
export const OWN_BUTTON_TEMPLATES: readonly string[] = ['lesson_feedback_request', 'lesson_join_link', 'lesson_rating'];

/** The permissions that lift the allow-list: every template, as the admin. */
export const ALL_TEMPLATES_PERMISSIONS = ['templates.manage', 'templates.send_all'] as const satisfies readonly Permission[];

/** Does this permission set send every template? Otherwise only the allow-list (restrictedMay). */
export function sendsAllTemplates(permissions: readonly string[] | null | undefined): boolean {
  return ALL_TEMPLATES_PERMISSIONS.some((p) => permissions?.includes(p) ?? false);
}

export type RestrictedCheck = Pick<TemplateView, 'key' | 'status' | 'sales_starter' | 'header_format'>;

/**
 * May a restricted role list or send this template? Approved, flagged by the admin, never a PDF one,
 * never an own-button one. The one rule behind both GET /messaging/templates and the thread send.
 */
export function restrictedMay(t: RestrictedCheck): boolean {
  return t.status === 'approved' && t.sales_starter && t.header_format !== 'document' && !OWN_BUTTON_TEMPLATES.includes(t.key);
}
