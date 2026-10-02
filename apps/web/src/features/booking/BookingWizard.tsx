import type { BookingResult } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { BookedPanel } from './BookedPanel';
import { STEPS, stepReady, type BookingDraft, type PickedStudent, type StepKey } from './draft';
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
}

/**
 * Booking wizard (R-SCH-06, R-LEAD-06): student(s) → teacher → slot + weekly repeat → package →
 * review → POST /booking. One filled primary per step («التالي», then «احجز» on the review).
 */
export function BookingWizard({ initial, primary, siblings, onOpenStudent }: BookingWizardProps) {
  const [draft, setDraft] = useState(initial);
  const [step, setStep] = useState<StepKey>('students');
  const [booked, setBooked] = useState<BookingResult | null>(null);
  const patch = (p: Partial<BookingDraft>) => setDraft((d) => ({ ...d, ...p }));
  const index = STEPS.indexOf(step);
  const go = (to: number) => setStep(STEPS[to] ?? step);

  if (booked && draft.teacher) return <BookedPanel result={booked} teacherId={draft.teacher.id} tz={draft.tz} />;

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
      <TeacherStep program={draft.program} genderPref={draft.genderPref} teacher={draft.teacher} onChange={patch} />
    ),
    slot: <SlotStep draft={draft} onChange={patch} />,
    package: <PackageStep draft={draft} onChange={(pkg) => patch({ pkg })} />,
    review: (
      <ReviewStep
        draft={draft}
        onMeetingLink={(meetingLink) => patch({ meetingLink })}
        onChangeSlot={() => setStep('slot')}
        onBooked={setBooked}
      />
    ),
  } satisfies Record<StepKey, unknown>;

  return (
    <>
      <WizardSteps step={step} />
      <section aria-label={t.booking.steps[step]}>{body[step]}</section>
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
