import { type CourseSubscription, type SalesCourseView } from '@ab/shared';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog } from '@ab/web-kit/components/ui/overlay/dialog';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { BookingWizard } from '@/features/teaching/booking/BookingWizard';
import type { BookingDraft } from '@/features/teaching/booking/draft/draft';
import { BookingModeContext, ChatReturnContext, CourseHeldContext } from '@/features/teaching/booking/mode';
import { lessonErrorText } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { refreshAfterSalesWrite, salesCourseQuery } from '@/features/sales/sales-money/api';
import { continuePlan, type ContinuePlan } from './course-continue';
import { courseDraft, courseFixedText, courseHint, courseTitle, subscriptionStartsText } from './course-draft';
import { ContinueChoice } from './ContinueChoice';
import { CourseSaved } from './CourseSaved';
import { SalesPackageCancel } from './SalesPackageCancel';
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


/** The previous days prefilled when she continues (or adjusts them); else null (the empty picker). */
const wizardStart = (plan: ContinuePlan | null, continuing: boolean): ContinuePlan | null => (continuing ? plan : null);

type BookingProps = { view: SalesCourseView; draft: BookingDraft; onClose: () => void };

/** When the previous days do not fit the new plan's days a week she adds or removes a day. */
function CourseBooking({ view, draft, onClose }: BookingProps) {
  const [choice, setChoice] = useState<Choice>(null);
  // Hold mode: the picks were kept as a draft, booked after the payment.
  const [saved, setSaved] = useState(false);
  const [now] = useState(() => new Date().toISOString());
  const plan = continuePlan(view, now);
  if (saved) return <CourseSaved onClose={onClose} />;
  if (plan && choice === null) {
    return (
      <ContinueChoice view={view} draft={draft} now={now} onContinue={() => setChoice('continue')} onOther={() => setChoice('other')} />
    );
  }
  const start = wizardStart(plan, choice === 'continue') ?? { draft: courseDraft(view, now) ?? draft, hint: courseHint(view) };
  const exit = plan ? { label: t.booking.courseChange.backToChoice, onExit: () => setChoice(null) } : undefined;
  return (
    <BookingModeContext.Provider value="sales">
      <ChatReturnContext.Provider value={onClose}>
        <CourseHeldContext.Provider value={() => setSaved(true)}>
          <BookingWizard
            initial={start.draft}
            primary={null}
            siblings={[]}
            onOpenStudent={noop}
            hint={start.hint}
            exit={exit}
          />
        </CourseHeldContext.Provider>
      </ChatReturnContext.Provider>
    </BookingModeContext.Provider>
  );
}

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

function CourseFacts({ sub }: { sub: CourseSubscription }) {
  return (
    <>
      <span className="block">{courseFixedText(sub)}</span>
      <span className="block">{subscriptionStartsText(sub)}</span>
    </>
  );
}

/** Course booking (R-ASST-01): exactly the plan's days a week, never over a clash, no invoice. */
export function SalesCourseDialog({ studentId, onClose }: Props) {
  const queryClient = useQueryClient();
  const course = useQuery(salesCourseQuery(studentId));
  // The first bookable view stays, so a refetch after booking (course_exists) cannot show refusal.
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
      {view?.hold && (
        <p className="rounded-md bg-gold-wash px-3 py-2 text-xs text-ink">{t.courseDraft.held}</p>
      )}
      {view && <CourseBody view={view} onClose={close} />}
      {view?.subscription && (
        <SalesPackageCancel
          studentId={view.student.id}
          subscriptionId={view.subscription.id}
          label={`${view.student.name} · ${view.student.code}`}
          onDone={close}
        />
      )}
    </Dialog>
  );
}
