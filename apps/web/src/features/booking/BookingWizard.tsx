import type { BookingResult } from '@ab/shared';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useFocusOnChange } from '@/components/ui/use-focus-on-change';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { chatPhone, subscribeTarget } from './booked';
import { BookedPanel } from './BookedPanel';
import { GapChip } from './GapChip';
import { STEPS, stepReady, type BookingDraft, type PickedStudent, type StepKey } from './draft';
import { teacherPatch, type BookHint } from './hint';
import { LeadStudentStep } from './LeadStudentStep';
import { PackageStep } from './PackageStep';
import { guardianCountry } from './price';
import { ReviewStep } from './ReviewStep';
import { SlotStep } from './SlotStep';
import { StudentStep } from './StudentStep';
import { TeacherStep } from './TeacherStep';
import { WizardSteps } from './WizardSteps';

export interface BookingWizardProps {
  initial: BookingDraft;
  /** The student the wizard opened for (profile entry), else null. */
  primary: PickedStudent | null;
  siblings: readonly StudentRef[];
  onOpenStudent: (id: string) => void;
  /** From a calendar free gap: that teacher, then that start, preselected. */
  hint?: BookHint | null;
}

/**
 * Booking wizard (R-SCH-06, R-LEAD-06): student(s) → teacher → length + package → slot + weekly
 * repeat → review → POST /booking. One filled primary per step («التالي», then «احجز» on the
 * review). Every step change (also «اختار ميعاد تاني») moves focus to the new step.
 */
export function BookingWizard({ initial, primary, siblings, onOpenStudent, hint = null }: BookingWizardProps) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<StepKey>('students');
  const [booked, setBooked] = useState<BookingResult | null>(null);
  const section = useRef<HTMLElement>(null);
  useFocusOnChange(section, step);
  const patch = (p: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...p }));
  const index = STEPS.indexOf(step);
  const go = (to: number) => setStep(STEPS[to] ?? step);

  if (booked && draft.teacher) {
    return (
      <BookedPanel
        result={booked}
        teacherId={draft.teacher.id}
        tz={draft.tz}
        subscribeFor={subscribeTarget(draft, booked)}
        chatPhone={chatPhone(draft)}
      />
    );
  }

  const body = {
    students:
      draft.leadId && !primary ? (
        <LeadStudentStep
          value={draft.newStudent ?? { name: '', guardianName: '', guardianPhone: '' }}
          tz={draft.tz}
          program={draft.program}
          onChange={({ newStudent, ...rest }) =>
            patch({
              ...rest,
              ...(newStudent ? { newStudent, country: guardianCountry({ phone_e164: newStudent.guardianPhone }) } : {}),
            })
          }
        />
      ) : (
        <StudentStep
          primary={primary}
          siblings={siblings}
          picked={draft.students}
          onPicked={(students) => patch({ students })}
          onOpenStudent={onOpenStudent}
        />
      ),
    teacher: (
      <TeacherStep
        program={draft.program}
        genderPref={draft.genderPref}
        teacher={draft.teacher}
        hintId={hint?.teacherId}
        onChange={(change) => patch(teacherPatch(draft, change, hint))}
      />
    ),
    package: <PackageStep draft={draft} onChange={patch} />,
    slot: <SlotStep draft={draft} onChange={patch} />,
    review: (
      <ReviewStep
        draft={draft}
        onMeetingLink={(meetingLink) => patch({ meetingLink })}
        onChangeSlot={() => setStep('slot')}
        onBooked={setBooked}
        onPatch={patch}
      />
    ),
  } satisfies Record<StepKey, unknown>;

  return (
    <>
      {hint?.startsAt && <GapChip startsAt={hint.startsAt} />}
      <WizardSteps step={step} />
      <section ref={section} tabIndex={-1} aria-label={t.booking.steps[step]} className="outline-none">
        {body[step]}
      </section>
      {step === 'students' && draft.leadId && !primary && !stepReady(draft, step) && (
        <p className="mt-3 text-xs text-ink-3">{t.booking.fillRequired}</p>
      )}
      <div className="mt-6 flex items-center justify-between gap-3 border-t border-rule pt-4">
        <Button type="button" variant="ghost" disabled={index === 0} onClick={() => go(index - 1)}>
          {t.booking.back}
        </Button>
        {step !== 'review' && (
          <Button type="button" disabled={!stepReady(draft, step)} onClick={() => go(index + 1)}>
            {t.booking.next}
          </Button>
        )}
      </div>
    </>
  );
}
