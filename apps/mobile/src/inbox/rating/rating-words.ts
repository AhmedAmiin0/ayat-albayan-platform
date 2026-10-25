import { RATING_TEMPLATE, type MessageView, type TemplateView } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

const r = t.inbox.rating;
const ERRORS: Record<string, string | undefined> = {
  template_not_approved: r.notApproved,
  no_completed_lesson: r.noLesson,
  not_a_guardian: r.noLesson,
};

/** The refusal's `code` in Arabic (as the web button says it), else «لم يُرسل طلب التقييم». */
export function ratingError(error: unknown): string {
  const body = error instanceof ApiError ? error.body : null;
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return (typeof code === 'string' ? ERRORS[code] : undefined) ?? r.failed;
}

/** What the 201 row says: failed (Meta refused it) is an error; queued waits for the send gate. */
export function ratingDone(sent: MessageView | undefined): { text: string; error: boolean } | null {
  if (!sent) return null;
  if (sent.status === 'failed') return { text: r.failed, error: true };
  return { text: sent.status === 'queued' ? r.queued : r.sent, error: false };
}

/** Meta has approved lesson_rating (the only state it can be sent in); anything but a list is «not yet». */
export const ratingApproved = (templates: readonly TemplateView[] | undefined): boolean =>
  Array.isArray(templates) && templates.some((x) => x.key === RATING_TEMPLATE && x.status === 'approved');
