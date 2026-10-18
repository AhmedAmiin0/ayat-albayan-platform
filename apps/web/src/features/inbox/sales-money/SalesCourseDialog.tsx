import type { CourseSubscription, SalesCourseView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { BookingWizard } from '@/features/booking/BookingWizard';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { lessonErrorText } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { refreshAfterSalesWrite, salesCourseQuery } from './api';
import { continuePlan } from './course-continue';
import { courseDraft, courseFixedText, courseHint, courseTitle, subscriptionStartsText } from './course-draft';
import { ContinueChoice } from './ContinueChoice';
import { SalesRunningCourse } from './SalesRunningCourse';

type Props = { studentId: string; onClose: () => void };

const noop = () => undefined;

type Choice = 'continue' | 'other' | null;

/** Why she can't book it herself, or «تغيير أيام الحلقات» of the running course. */
function CourseBlocked({ view }: { view: SalesCourseView }) {
  if (view.blocked === 'course_exists' && view.current) return <SalesRunningCourse view={view} current={view.current} />;
  return (
    <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
      {t.booking.courseBlocked[view.blocked ?? 'subscription_required']}
    </p>
  );
}

/**
 * The reason (CourseBlocked), a renewal's «تابِع بنفس الأيام» choice, then the wizard (teacher → one
 * time per day → review), prefilled with the previous teacher and days when she continues.
 */
function CourseBody({ view, onClose }: { view: SalesCourseView; onClose: () => void }) {
  const [choice, setChoice] = useState<Choice>(null);
  const [now] = useState(() => new Date().toISOString());
  const draft = courseDraft(view);
  if (!draft) return <CourseBlocked view={view} />;
  const plan = continuePlan(view, now);
  if (plan && choice === null) {
    return <ContinueChoice view={view} onContinue={() => setChoice('continue')} onOther={() => setChoice('other')} />;
  }
  const same = choice === 'continue' ? plan : null;
  return (
    <BookingModeContext.Provider value="sales">
      <ChatReturnContext.Provider value={onClose}>
        <BookingWizard
          initial={same?.draft ?? draft}
          primary={null}
          siblings={[]}
          onOpenStudent={noop}
          hint={same?.hint ?? courseHint(view)}
        />
      </ChatReturnContext.Provider>
    </BookingModeContext.Provider>
  );
}

/** The header's fixed facts: package and length, then «يبدأ الاشتراك في …». */
function CourseFacts({ sub }: { sub: CourseSubscription }) {
  return (
    <>
      <span className="block">{courseFixedText(sub)}</span>
      <span className="block">{subscriptionStartsText(sub)}</span>
    </>
  );
}

/**
 * «أيام الحلقات» (owner 2026-10-18, R-ASST-01): the assistant books the weekly course of a subscription
 * she sold, over the chat. Exactly the plan's days a week, each with its own time from the teacher's
 * free slots; the course stops after the plan's lessons. No invoice, no link, never over a clash. A
 * student without a subscription, with a course already, or with a custom count gets the reason instead;
 * a running course offers «تغيير أيام الحلقات», a renewal «تابِع بنفس الأيام» (owner 2026-10-18).
 */
export function SalesCourseDialog({ studentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const course = useQuery(salesCourseQuery(studentId));
  // The first bookable view stays while the dialog is open: a refetch after «احجز» (now
  // course_exists) must not replace the booked panel with the refusal. Closing refreshes it.
  const [held, setHeld] = useState<SalesCourseView | null>(null);
  if (!held && course.data && courseDraft(course.data)) setHeld(course.data);
  const view = held ?? course.data;
  const close = () => {
    void refreshAfterSalesWrite(queryClient);
    onClose();
  };
  const sub = view?.subscription;
  const description = sub ? <CourseFacts sub={sub} /> : undefined;
  return (
    <Dialog title={courseTitle(view)} description={description} onClose={close} wide>
      {!view && course.isError && <FormAlert>{lessonErrorText(course.error)}</FormAlert>}
      {!view && course.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {view && <CourseBody view={view} onClose={close} />}
    </Dialog>
  );
}
