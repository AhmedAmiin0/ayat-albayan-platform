import { RATING_TEMPLATE } from '../../lesson/rating.js';
import { ACCOUNT_CODE_TEMPLATE } from '../../../people/users/index.js';
import { TEMPLATE_KEYS } from '../templates.js';

// Code-bound templates (owner 2026-11-14): the platform sends them by itself with a fixed number of
// variables and fixed buttons (the reminders, booking_*, teacher_lesson_*, report_ready* =
// session_report_* on Meta, renewal_due, account_code, lesson_join_link, the feedback and rating
// ones…). An edit may change their wording only.

/**
 * Every key a producer queues (TEMPLATE_KEYS), the sign-in code, the rating buttons, and the CRM's
 * own name of teacher_new_student's alert (teacher_lesson_v2, docs/19).
 */
export const CODE_BOUND_TEMPLATES: ReadonlySet<string> = new Set<string>([
  ...TEMPLATE_KEYS,
  ACCOUNT_CODE_TEMPLATE,
  RATING_TEMPLATE,
  'teacher_lesson_v2',
]);

export const isCodeBound = (key: string): boolean => CODE_BOUND_TEMPLATES.has(key);

/** What the code relies on: how many body variables, and each button's type and link. */
export interface BoundShape {
  params: number;
  buttons: readonly { type: string; url?: string }[];
}

export type CodeBoundReason = 'code_bound_variables' | 'code_bound_buttons';

const buttonSig = (b: BoundShape['buttons'][number]): string => `${b.type}|${b.url ?? ''}`;
const sameButtons = (a: BoundShape, b: BoundShape): boolean =>
  a.buttons.map(buttonSig).join('\n') === b.buttons.map(buttonSig).join('\n');

/**
 * Why this edit of a code-bound template is refused, or null: another number of variables, or
 * buttons that differ in count, type, order or link (a button's words may change).
 */
export function codeBoundProblem(before: BoundShape, after: BoundShape): CodeBoundReason | null {
  if (before.params !== after.params) return 'code_bound_variables';
  return sameButtons(before, after) ? null : 'code_bound_buttons';
}
