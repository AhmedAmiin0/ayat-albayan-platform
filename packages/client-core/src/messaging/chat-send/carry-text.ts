import { MESSAGE_TEMPLATE, type TemplateView } from '@ab/shared';
import type { WindowBar } from './window-bar.js';

// «أرسِل الآن داخل قالب» (owner 2026-11-14: «a template that carries your text»): after the 24 h
// window, staff send their typed draft now inside `academy_message` instead of holding it.

/**
 * The template that carries the text: `academy_message` when this user may send it from the chat
 * line. `allowed` = the composer's own list (the API lists approved, allowed templates only).
 */
export function messageTemplate(allowed: readonly TemplateView[]): TemplateView | null {
  return allowed.find((x) => x.key === MESSAGE_TEMPLATE && x.line === 'chat') ?? null;
}

export interface CarryTextInput {
  bar: WindowBar;
  /** The chat's unsent draft (the text box). */
  draft: string;
  /** messageTemplate(): approved on the chat line and allowed for this user, or null. */
  template: TemplateView | null;
}

/** The bar's second action: the reopen bar shows, a draft is typed, the template is usable. */
export const carriesText = (c: CarryTextInput): boolean =>
  c.bar === 'reopen' && c.draft.trim() !== '' && c.template?.status === 'approved';
