import { ACCOUNT_CODE_TEMPLATE, restrictedMay, type RestrictedCheck } from '@ab/shared';
import type { HttpException } from '@nestjs/common';
import { waHttpError } from '@/modules/messaging/whatsapp';

/** A refusal: the error code and its HTTP status. */
type Refusal = readonly [code: string, status: number];

/**
 * Templates another flow sends, never a hand-made send from the inbox (H4):
 * - lesson_feedback_request: its link is signed per lesson and student by «ابعت طلب الرأي»
 *   (FeedbackModule); a hand-made button is a dead link;
 * - lesson_join_link: «ابعت لينك الحلقة» (ClassroomModule) mints the one-lesson token;
 * - lesson_rating: «إرسال تقييم الحلقة» picks the lesson and its date itself (rule 6) and sets
 *   the button payloads;
 * - the sign-in code (docs/30) is only ever sent by the API itself, never typed by hand.
 */
export const BLOCKED_TEMPLATES: Readonly<Record<string, Refusal>> = {
  lesson_feedback_request: ['use_feedback_request', 400],
  lesson_join_link: ['use_join_link', 400],
  lesson_rating: ['use_rating_button', 400],
  [ACCOUNT_CODE_TEMPLATE]: ['template_not_allowed', 403],
};

/** The refusal for a key another flow owns, or null (an external key: looked up with hasOwn). */
export function blockedTemplate(key: string): HttpException | null {
  const refusal = Object.hasOwn(BLOCKED_TEMPLATES, key) ? BLOCKED_TEMPLATES[key] : undefined;
  return refusal ? waHttpError(...refusal) : null;
}

/** Who asks to send an approved template. */
interface TemplateAsk {
  /** A role limited to the allow-list (restrictedMay). */
  restricted: boolean;
}

interface TemplateGuard {
  fails: (template: RestrictedCheck, ask: TemplateAsk) => boolean;
  refusal: Refusal;
}

/** Checked in order on an approved template; the first that fails refuses the send. */
const TEMPLATE_GUARDS: readonly TemplateGuard[] = [
  {
    fails: (t, ask) => ask.restricted && !restrictedMay(t),
    refusal: ['template_not_allowed', 403],
  },
  // A PDF template comes only from the PDF job.
  { fails: (t) => t.header_format === 'document', refusal: ['needs_document', 400] },
];

/** The first guard an approved template fails, as its error, or null when it may be sent. */
export function templateRefusal(template: RestrictedCheck, ask: TemplateAsk): HttpException | null {
  const failed = TEMPLATE_GUARDS.find((guard) => guard.fails(template, ask));
  return failed ? waHttpError(...failed.refusal) : null;
}
