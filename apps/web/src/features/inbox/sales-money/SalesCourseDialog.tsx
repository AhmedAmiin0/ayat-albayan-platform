import type { SalesCourseView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { BookingWizard } from '@/features/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { lessonErrorText } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { refreshAfterSalesWrite, salesCourseQuery } from './api';
import { courseDraft, courseFixedText, courseHint } from './course-draft';

type Props = { studentId: string; onClose: () => void };

const noop = () => undefined;

/** Why she can't book it herself, or the wizard (teacher → one time per day → review). */
function CourseBody({ view, onClose }: { view: SalesCourseView; onClose: () => void }) {
  const draft = courseDraft(view);
  if (!draft) {
    return (
      <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
        {t.booking.courseBlocked[view.blocked ?? 'subscription_required']}
      </p>
    );
  }
  return (
    <BookingModeContext.Provider value="sales">
      <ChatReturnContext.Provider value={onClose}>
        <BookingWizard initial={draft} primary={null} siblings={[]} onOpenStudent={noop} hint={courseHint(view)} />
      </ChatReturnContext.Provider>
    </BookingModeContext.Provider>
  );
}

/**
 * «أيام الحلقات» (owner 2026-10-18, R-ASST-01): the assistant books the weekly course of a subscription
 * she sold, over the chat. Exactly the plan's days a week, each with its own time from the teacher's
 * free slots; the course stops after the plan's lessons. No invoice, no link, never over a clash. A
 * student without a subscription, with a course already, or with a custom count gets the reason instead.
 */
export function SalesCourseDialog({ studentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const course = useQuery(salesCourseQuery(studentId));
  const close = () => {
    void refreshAfterSalesWrite(queryClient);
    onClose();
  };
  const sub = course.data?.subscription;
  return (
    <Dialog title={t.booking.courseDays} description={sub ? courseFixedText(sub) : undefined} onClose={close} wide>
      {course.isError && <FormAlert>{lessonErrorText(course.error)}</FormAlert>}
      {course.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {course.data && <CourseBody view={course.data} onClose={close} />}
    </Dialog>
  );
}
