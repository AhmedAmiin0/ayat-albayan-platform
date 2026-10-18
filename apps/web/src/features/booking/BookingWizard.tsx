import type { BookingResult } from '@ab/shared';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFocusOnChange } from '@/components/ui/use-focus-on-change';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { chatPhone, subscribeTarget } from './booked';
import { BookedPanel } from './BookedPanel';
import { GapChip } from './GapChip';
import { stepReady, stepsOf, type BookingDraft, type PickedStudent, type StepKey } from './draft';
import type { BookHint } from './hint';
import { isNewStudent } from './new-student';
import { useCourseClean } from './SeriesCheck';
import { WizardBody } from './WizardBody';
import { WizardSteps } from './WizardSteps';

export interface BookingWizardProps {
  initial: BookingDraft;
  /** The student the wizard opened for (profile entry), else null. */
  primary: PickedStudent | null;
  siblings: readonly StudentRef[];
  /** Reopens /admin/book for another student; the booking type picked so far rides along. */
  onOpenStudent: (id: string, kind?: BookingDraft['kind']) => void;
  /** From a calendar free gap: that teacher, then that start, preselected. */
  hint?: BookHint | null;
  /** The type and package the admin picked, for the page title («تجريبية» only while it is the trial). */
  onChoice?: (choice: Pick<BookingDraft, 'kind' | 'pkg'>) => void;
  /** From a missed lesson's drawer: the makeup's missed-lesson step preselects it (R-SCH-10). */
  missedLessonId?: string | undefined;
  /** «رجوع» on the first step back to the caller's screen (a renewal's «تابِع بنفس الأيام» choice); absent = none. */
  exit?: { label: string; onExit: () => void } | undefined;
}

type BackProps = { first: boolean; exit: BookingWizardProps['exit']; onBack: () => void };

/** «رجوع» to the previous step; on the first step the caller's exit, else disabled. */
function BackButton({ first, exit, onBack }: BackProps) {
  const leave = first ? exit : undefined;
  return (
    <Button type="button" variant="ghost" disabled={first && !leave} onClick={leave ? leave.onExit : onBack}>
      {leave ? leave.label : t.booking.back}
    </Button>
  );
}

/**
 * Booking wizard (R-SCH-06, R-LEAD-06, R-SCH-10): booking type + student(s) → [missed lesson] →
 * teacher → [length + package] → slot (+ weekly repeat) → [invoice] → review → POST /booking. One
 * filled primary per step («التالي», then «احجز» on the review). Every step change (also «اختار
 * ميعاد تاني») moves focus to the new step.
 */
export function BookingWizard(props: BookingWizardProps) {
  const { initial, primary, siblings, onOpenStudent, hint = null, onChoice, missedLessonId, exit } = props;
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<StepKey>(() => stepsOf(initial)[0] ?? 'students');
  const [booked, setBooked] = useState<BookingResult | null>(null);
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
