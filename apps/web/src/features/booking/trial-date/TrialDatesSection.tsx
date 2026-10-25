import { canPickTrialDate, type Gender } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { usePermissions } from '@/features/auth/use-permissions';
import type { StudentProfile } from '@/features/students/types';
import { trialHistoryQuery } from './api';
import { TrialDateButton } from './TrialDateButton';
import { TrialDateDialog } from './TrialDateDialog';
import { TrialHistoryBody, TrialHistoryTitle } from './TrialHistoryBody';

/** GET /students/:id returns every column; the teacher preference is one of them (migration 070). */
type Profile = StudentProfile & { teacher_gender_pref?: Gender | null };

/**
 * The student file's «مواعيد الحلقة التجريبية» (R-STU-05): the count, «موعد تجريبي جديد» (disabled
 * with the reason for a subscriber), and the compact history. Admin routes (/booking, booking.write):
 * a role without it sees no section rather than a 403.
 */
export function TrialDatesSection({ student }: { student: Profile }) {
  const { can } = usePermissions();
  return can('booking.write') ? <TrialDates student={student} /> : null;
}

function TrialDates({ student }: { student: Profile }) {
  const titleId = useId();
  const history = useQuery(trialHistoryQuery(student.id));
  const [open, setOpen] = useState(false);
  const allowed = history.data?.allowed ?? canPickTrialDate(student.status);
  const facts = { program: student.program, genderPref: student.teacher_gender_pref ?? null, tz: student.tz };
  return (
    <section aria-labelledby={titleId} data-testid="trial-dates-section" className="mb-6 grid gap-3 border-b border-rule pb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TrialHistoryTitle id={titleId} history={history.data} />
        <TrialDateButton allowed={allowed} onOpen={() => setOpen(true)} />
      </div>
      <TrialHistoryBody query={history} />
      {open && (
        <TrialDateDialog
          student={{ id: student.id, name: student.name, code: student.code }}
          mode="admin"
          facts={facts}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}
