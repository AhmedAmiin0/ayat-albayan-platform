import { RATING_TEMPLATE, type MessageView, type TemplateView } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import { z } from 'zod';
import { errorCode } from '@/core/lib/http/error-code';

const r = t.inbox.rating;
const templateList = z.array(z.object({ key: z.string(), status: z.string() }));
const ERRORS: Record<string, string | undefined> = {
  template_not_approved: r.notApproved,
  no_completed_lesson: r.noLesson,
  not_a_guardian: r.noLesson,
};

/** Maps the refusal code as the web button does, else a generic failure. */
export function ratingError(error: unknown): string {
  const code = errorCode(error);
  return (code === undefined ? undefined : ERRORS[code]) ?? r.failed;
}

/** What the 201 row says: failed (Meta refused it) is an error; queued waits for the send gate. */
export function ratingDone(sent: MessageView | undefined): { text: string; error: boolean } | null {
  if (!sent) return null;
  if (sent.status === 'failed') return { text: r.failed, error: true };
  return { text: sent.status === 'queued' ? r.queued : r.sent, error: false };
}

/** lesson_rating can only be sent once Meta approved it; anything but a list is «not yet». */
export const ratingApproved = (templates: readonly TemplateView[] | undefined): boolean =>
  (templateList.safeParse(templates).data ?? []).some(
    (x) => x.key === RATING_TEMPLATE && x.status === 'approved',
  );
