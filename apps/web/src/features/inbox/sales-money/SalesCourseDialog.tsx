import { continueFits, type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog } from '@/components/ui/dialog';
import { FormAlert } from '@/components/ui/form-alert';
import { BookingWizard } from '@/features/booking/BookingWizard';
import type { BookingDraft } from '@/features/booking/draft';
import { BookingModeContext, ChatReturnContext } from '@/features/booking/mode';
import { lessonErrorText } from '@/features/schedule/api';
import { t } from '@/lib/i18n';
import { refreshAfterSalesWrite, salesCourseQuery } from './api';
import { continuePlan, type ContinuePlan } from './course-continue';
import { courseDraft, courseFixedText, courseHint, courseTitle, subscriptionStartsText } from './course-draft';
import { ContinueChoice } from './ContinueChoice';
import { SalesRunningCourse } from './SalesRunningCourse';

type Props = { studentId: string; onClose: () => void };

const noop = () => undefined;

type Choice = 'continue' | 'other' | null;

/** Why she can't book it herself. */
function CourseBlocked({ view }: { view: SalesCourseView }) {
  return (
    <p role="status" className="rounded-md bg-sunk px-3.5 py-2.5 text-sm">
      {t.booking.courseBlocked[view.blocked ?? 'subscription_required']}
    </p>
  );
}

type StartInput = { view: SalesCourseView; plan: ContinuePlan | null; continuing: boolean };

/** The previous days prefilled when she continues, or when continuing does not fit; else null (the empty picker). */
const wizardStart = ({ view, plan, continuing }: StartInput): ContinuePlan | null =>
  continuing || !continueFits(view) ? plan : null;

type BookingProps = { view: SalesCourseView; draft: BookingDraft; onClose: () => void };

/**
 * A renewal's «تابِع بنفس الأيام» choice, then the wizard (teacher → one time per day → review),
 * prefilled with the previous teacher and days when she continues, or when continuing does not fit
 * the new plan's days a week (she adds or removes a day). «رجوع إلى اختيار الأيام» goes back to the choice.
 */
function CourseBooking({ view, draft, onClose }: BookingProps) {
  const [choice, setChoice] = useState<Choice>(null);
  const [now] = useState(() => new Date().toISOString());
  const plan = continuePlan(view, now);
  if (plan && choice === null) {
    return (
      <ContinueChoice view={view} draft={draft} now={now} onContinue={() => setChoice('continue')} onOther={() => setChoice('other')} />
    );
  }
  const start = wizardStart({ view, plan, continuing: choice === 'continue' }) ?? { draft: courseDraft(view, now) ?? draft, hint: courseHint(view) };
  const exit = plan ? { label: t.booking.courseChange.backToChoice, onExit: () => setChoice(null) } : undefined;
  return (
    <BookingModeContext.Provider value="sales">
      <ChatReturnContext.Provider value={onClose}>
        <BookingWizard initial={start.draft} primary={null} siblings={[]} onOpenStudent={noop} hint={start.hint} exit={exit} />
      </ChatReturnContext.Provider>
    </BookingModeContext.Provider>
  );
}

/** The booking (or why not), under «تغيير أيام الحلقات» whenever the student has a course to change. */
function CourseBody({ view, onClose }: { view: SalesCourseView; onClose: () => void }) {
  const draft = courseDraft(view);
  const current = view.current;
  const running = current && view.blocked === 'course_exists';
  const body = draft ? <CourseBooking view={view} draft={draft} onClose={onClose} /> : running ? null : <CourseBlocked view={view} />;
  if (!current) return body;
  return (
    <SalesRunningCourse view={view} current={current}>
      {body}
    </SalesRunningCourse>
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
 * a course to change (view.current: running, or booked ahead) offers «تغيير أيام الحلقات» beside the
 * rest, a renewal «تابِع بنفس الأيام» (owner 2026-10-18).
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
