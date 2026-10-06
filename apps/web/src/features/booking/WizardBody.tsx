import type { BookingResult } from '@ab/shared';
import type { StudentRef } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { mediaPhone } from './booked';
import type { BookingDraft, PickedStudent, StepKey } from './draft';
import { teacherPatch, type BookHint } from './hint';
import { InvoiceStep } from './InvoiceStep';
import { KindStep } from './KindStep';
import { LeadStudentStep } from './LeadStudentStep';
import { MissedLessonStep } from './MissedLessonStep';
import { useBookingMode } from './mode';
import { isNewStudent } from './new-student';
import { PackageStep } from './PackageStep';
import { guardianCountry } from './price';
import { ReviewStep } from './ReviewStep';
import { SlotStep } from './SlotStep';
import { StudentStep } from './StudentStep';
import { TeacherStep } from './TeacherStep';

export interface WizardBodyProps {
  step: StepKey;
  draft: BookingDraft;
  patch: (patch: Partial<BookingDraft>) => void;
  /** The student the wizard opened for (profile entry), else null. */
  primary: PickedStudent | null;
  siblings: readonly StudentRef[];
  onOpenStudent: (id: string) => void;
  hint: BookHint | null;
  /** From a missed lesson's drawer: the makeup step preselects it. */
  missedLessonId: string | undefined;
  onGoto: (step: StepKey) => void;
  onBooked: (result: BookingResult) => void;
}

/** The body of the current step (the wizard owns the chrome: step list, «التالي» and «رجوع»). */
export function WizardBody({ step, draft, patch, primary, siblings, onOpenStudent, hint, missedLessonId, onGoto, onBooked }: WizardBodyProps) {
  const mode = useBookingMode();
  switch (step) {
    case 'students': {
      const leadPath = isNewStudent(draft) && !primary;
      return (
        <div className="grid gap-6">
          {mode === 'admin' && <KindStep draft={draft} leadPath={leadPath} onChange={patch} />}
          {leadPath ? (
            <LeadStudentStep
              value={draft.newStudent ?? { name: '', guardianName: '', guardianPhone: '' }}
              tz={draft.tz}
              title={draft.leadId ? undefined : t.assistantPortal.register.newStudent}
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
              single={draft.kind === 'makeup'}
            />
          )}
        </div>
      );
    }
    case 'missed':
      return <MissedLessonStep draft={draft} preselectId={missedLessonId} onChange={patch} />;
    case 'teacher':
      return (
        <TeacherStep
          program={draft.program}
          genderPref={draft.genderPref}
          teacher={draft.teacher}
          hintId={hint?.teacherId ?? draft.missed?.teacherId}
          onChange={(change) => patch(teacherPatch(draft, change, hint))}
        />
      );
    case 'package':
      return <PackageStep draft={draft} onChange={patch} />;
    case 'slot':
      return <SlotStep draft={draft} onChange={patch} />;
    case 'invoice':
      return <InvoiceStep draft={draft} chatPhone={mediaPhone(draft)} onChange={patch} />;
    case 'review':
      return (
        <ReviewStep
          draft={draft}
          onMeetingLink={(meetingLink) => patch({ meetingLink })}
          onChangeSlot={() => onGoto('slot')}
          onInvoice={() => onGoto('invoice')}
          onBooked={onBooked}
          onPatch={patch}
        />
      );
  }
}
