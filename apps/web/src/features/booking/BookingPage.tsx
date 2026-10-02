import type { Gender } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { studentQuery } from '@/features/students/api';
import type { StudentProfile } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { guardianQuery, type BookSearch, type GuardianRow } from './api';
import { BookingWizard } from './BookingWizard';
import { emptyDraft, type BookingDraft } from './draft';
import { guardianCountry } from './price';

export interface BookingPageProps {
  search: BookSearch;
  /** Reopens /admin/book for another student. */
  onOpenStudent: (id: string) => void;
}

/** GET /students/:id returns every column; the gender preference is one of them (migration 070). */
type ProfileWithPref = StudentProfile & { teacher_gender_pref?: Gender | null };

export function draftFromStudent(s: ProfileWithPref, guardian: GuardianRow | undefined): BookingDraft {
  return {
    ...emptyDraft(),
    students: [{ id: s.id, name: s.name, code: s.code }],
    tz: s.tz,
    program: s.program,
    genderPref: s.teacher_gender_pref ?? null,
    country: guardianCountry(guardian ?? s.guardian),
  };
}

/** A lead books a trial, unless «اشترك» in the chat asked for a regular package (R-SUB-01). */
export function draftFromLead(search: BookSearch): BookingDraft {
  const phone = search.phone ?? '';
  return {
    ...emptyDraft({ leadId: search.leadId ?? null }),
    pkg: search.pkg ?? 'trial',
    newStudent: { name: '', guardianName: search.name ?? '', guardianPhone: phone },
    country: guardianCountry({ phone_e164: phone }),
  };
}

/**
 * /admin/book (R-SCH-06): from a student profile «احجز حلقات» (student + siblings), from a lead
 * row «حجز حلقة تجريبية» or the chat's «اشترك» (new student + guardian, R-LEAD-06), or bare
 * (search a student first).
 */
export function BookingPage({ search, onOpenStudent }: BookingPageProps) {
  const trial = !!search.leadId && (search.pkg ?? 'trial') === 'trial';
  return (
    <>
      <PageHead>
        <Cartouche>{trial ? t.booking.trialTitle : t.booking.title}</Cartouche>
      </PageHead>
      {search.studentId ? (
        <StudentBooking studentId={search.studentId} onOpenStudent={onOpenStudent} />
      ) : (
        <BookingWizard
          key={search.leadId ? `${search.leadId}-${search.pkg ?? 'trial'}` : 'bare'}
          initial={search.leadId ? draftFromLead(search) : emptyDraft()}
          primary={null}
          siblings={[]}
          onOpenStudent={onOpenStudent}
        />
      )}
    </>
  );
}

/** The wizard for one student, once their profile (tz, program, siblings) and guardian are in. */
function StudentBooking({ studentId, onOpenStudent }: { studentId: string; onOpenStudent: (id: string) => void }) {
  const student = useQuery(studentQuery(studentId));
  const guardianId = student.data?.guardian_id;
  const guardian = useQuery({ ...guardianQuery(guardianId ?? ''), enabled: !!guardianId });
  if (student.isError) return <FormAlert>{t.common.notFound}</FormAlert>;
  // The guardian only refines the price currency; its failure falls back to the phone's country.
  if (!student.data || guardian.isPending) return <p className="text-ink-3">{t.common.loading}</p>;
  const s = student.data;
  return (
    <BookingWizard
      key={s.id}
      initial={draftFromStudent(s, guardian.data)}
      primary={{ id: s.id, name: s.name, code: s.code }}
      siblings={s.siblings.filter((x) => x.id !== s.id)}
      onOpenStudent={onOpenStudent}
    />
  );
}
