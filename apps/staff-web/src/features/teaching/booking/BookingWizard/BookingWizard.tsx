import type { StudentRef, TrialDateResult } from '@ab/shared';
import type { BookingResult } from '@ab/schedule';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { useFocusOnChange } from '@ab/web-kit/components/ui/overlay/use-focus-on-change';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { chatPhone, subscribeTarget } from '@/features/teaching/booking/steps/review/booked';
import { BookedPanel } from '@/features/teaching/booking/steps/review/BookedPanel';
import { GapChip } from '@/features/teaching/booking/steps/slots/GapChip';
import { stepReady, stepsOf, type BookingDraft, type PickedStudent, type StepKey } from '@/features/teaching/booking/draft/draft';
import type { BookHint } from '@/features/teaching/booking/hint';
import { isNewStudent } from '@/features/teaching/booking/steps/who/new-student';
import { useCourseClean } from '@/features/teaching/booking/steps/review/SeriesCheck';
import { TrialDonePanel } from '@/features/teaching/booking/trial-date/dialog/TrialDonePanel';
import { WizardBody } from '@/features/teaching/booking/WizardBody';
import { WizardSteps } from '@/features/teaching/booking/WizardSteps';

export interface BookingWizardProps {
  initial: BookingDraft;
  /** The student the wizard opened for (profile entry), else null. */
  primary: PickedStudent | null;
  siblings: readonly StudentRef[];
  /** Reopens /admin/book for another student; the booking type picked so far rides along. */
  onOpenStudent: (id: string, kind?: BookingDraft['kind']) => void;
  /** From a calendar free gap: that teacher, then that start, preselected. */
  hint?: BookHint | null;
  /** For the page title, which says trial only while it is the trial. */
  onChoice?: (choice: Pick<BookingDraft, 'kind' | 'pkg'>) => void;
  /** From a missed lesson's drawer: the makeup's missed-lesson step preselects it (R-SCH-10). */
  missedLessonId?: string | undefined;
  /** Back on the first step returns to the caller's screen; absent means none. */
  exit?: { label: string; onExit: () => void } | undefined;
  /** The step to open on (a kept sales draft, docs/20 W9); absent = the first step. */
  initialStep?: StepKey | undefined;
  /** Every draft / step change, and `booked` once the booking is made (the sales chat keeps the draft). */
  onProgress?: ((p: { draft: BookingDraft; step: StepKey; booked: boolean }) => void) | undefined;
}

type BackProps = { first: boolean; exit: BookingWizardProps['exit']; onBack: () => void };

/** On the first step the caller's exit, else disabled. */
function BackButton({ first, exit, onBack }: BackProps) {
  const leave = first ? exit : undefined;
  return (
    <Button type="button" variant="ghost" disabled={first && !leave} onClick={leave ? leave.onExit : onBack}>
      {leave ? leave.label : t.booking.back}
    </Button>
  );
}

/** R-SCH-06, R-LEAD-06, R-SCH-10: one filled primary per step; every step change moves focus. */
export function BookingWizard(props: BookingWizardProps) {
  const {
    initial,
    primary,
    siblings,
    onOpenStudent,
    hint = null,
    onChoice,
    missedLessonId,
    exit,
    onProgress,
  } = props;
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<StepKey>(
    () => props.initialStep ?? stepsOf(initial)[0] ?? 'students',
  );
  const [booked, setBooked] = useState<BookingResult | null>(null);
  const [trialDone, setTrialDone] = useState<TrialDateResult | null>(null);
  useEffect(() => {
    onProgress?.({ draft, step, booked: booked !== null || trialDone !== null });
  }, [draft, step, booked, trialDone, onProgress]);
  const section = useRef<HTMLElement>(null);
  useFocusOnChange(section, step);
  const patch = (p: Partial<BookingDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    if (p.pkg || p.kind) onChoice?.({ kind: p.kind ?? draft.kind, pkg: p.pkg ?? draft.pkg });
  };
  const steps = stepsOf(draft);
  const index = steps.indexOf(step);
  const go = (to: number) => setStep(steps[to] ?? step);
  // The assistant's course leaves the slot step only over a clean series check (no clash, no error).
  const clean = useCourseClean(draft);
  const ready = stepReady(draft, step) && (step !== 'slot' || !draft.course || clean);

  if (trialDone) return <TrialDonePanel result={trialDone} tz={draft.tz} />;
  if (booked && draft.teacher) {
    return (
      <BookedPanel
        result={booked}
        teacherId={draft.teacher.id}
        tz={draft.tz}
        kind={draft.kind}
        subscribeFor={subscribeTarget(draft, booked)}
        chatPhone={chatPhone(draft)}
      />
    );
  }

  return (
    <>
      {hint?.startsAt && <GapChip startsAt={hint.startsAt} />}
      <WizardSteps steps={steps} step={step} />
      <section ref={section} tabIndex={-1} aria-label={t.booking.steps[step]} className="outline-none">
        <WizardBody
          step={step}
          draft={draft}
          patch={patch}
          primary={primary}
          siblings={siblings}
          onOpenStudent={(id) => onOpenStudent(id, draft.kind)}
          hint={hint}
          missedLessonId={missedLessonId}
          onGoto={setStep}
          onBooked={setBooked}
          onTrialDone={setTrialDone}
        />
      </section>
      {step === 'students' && isNewStudent(draft) && !primary && !stepReady(draft, step) && (
        <p className="mt-3 text-xs text-ink-3">{t.booking.fillRequired}</p>
      )}
      {step === 'slot' && draft.course && stepReady(draft, step) && !clean && (
        <p className="mt-3 text-xs text-ink-3">{t.booking.courseNeedsCheck}</p>
      )}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-4">
        <BackButton first={index === 0} exit={exit} onBack={() => go(index - 1)} />
        {step !== 'review' && (
          <Button type="button" disabled={!ready} onClick={() => go(index + 1)}>
            {t.booking.next}
          </Button>
        )}
      </div>
    </>
  );
}
