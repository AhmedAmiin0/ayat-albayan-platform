import type { Permission } from '@ab/catalog';
import { OWN_BUTTON_TEMPLATES, type TemplateSender } from '../restricted-templates.js';
import type { TemplateView } from '../template-views.js';
import type { AuthorCategory } from './template-edit.js';
import { isCodeBound } from './code-bound.js';
import { editRoute } from './edit-limits.js';

// Sales authoring (owner 2026-11-14): templates.author lets a role write its own templates for the
// allow-list. It never lifts the allow-list and never opens the templates.manage routes.

export const AUTHOR_PERMISSION = 'templates.author' satisfies Permission;

/** New templates one user may create in a rolling day. */
export const AUTHOR_DAILY_LIMIT = 5;

/** May this user open «القوالب» as an author (list the allow-list, create, edit their own)? */
export const authorsTemplates = (who: TemplateSender | null | undefined): boolean =>
  (who?.permissions ?? []).includes(AUTHOR_PERMISSION);

export type AuthorEditable = Pick<TemplateView, 'key' | 'sales_starter' | 'line' | 'header_format' | 'status'>;

/**
 * May an author edit this template? On the allow-list, on the chat line, not code-bound, not a PDF
 * or own-button one, and in a status Meta lets one edit (not while pending review).
 */
export function authorMayEdit(t: AuthorEditable): boolean {
  const rules = [
    t.sales_starter,
    t.line === 'chat',
    !isCodeBound(t.key),
    t.header_format !== 'document',
    !OWN_BUTTON_TEMPLATES.includes(t.key),
    editRoute(t.status) !== null,
  ];
  return rules.every(Boolean);
}

/** Words of an offer: the template is then MARKETING by default (Meta's rule for promotions). */
const OFFER = /عرض|عروض|خصم|تخفيض|مجان|هدي[ةه]|اشترك|سجّ?ل الآن|فرصة|لفترة محدودة|%/;

/** The category picked until the author changes it: MARKETING for an offer, else UTILITY. */
export const suggestedCategory = (body: string): AuthorCategory =>
  (OFFER.test(body) ? 'marketing' : 'utility');
