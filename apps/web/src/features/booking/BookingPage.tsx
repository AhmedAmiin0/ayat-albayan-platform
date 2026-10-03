import type { Gender } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Cartouche } from '@/components/ui/cartouche';
import { FormAlert } from '@/components/ui/form-alert';
import { PageHead } from '@/components/ui/page';
import { leadByPhoneQuery, type InboxLead } from '@/features/inbox/api';
import { studentQuery } from '@/features/students/api';
import type { StudentProfile } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { guardianQuery, type BookSearch, type GuardianRow } from './api';
import { BookingWizard } from './BookingWizard';
import { emptyDraft, type BookingDraft } from './draft';
import { bookHint, type BookHint } from './hint';
import { newStudentFromLead } from './new-student';
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

/**
 * A lead books a trial, unless «اشترك» in the chat asked for a regular package (R-SUB-01). What
 * «بيانات الطالب» captured and the lead's source prefill step 1 (research-forms item 2).
 */
export function draftFromLead(search: BookSearch, lead: InboxLead | null): BookingDraft {
  const base = emptyDraft({ leadId: search.leadId ?? null });
  const { student, tz } = newStudentFromLead(lead, search);
  return {
    ...base,
    pkg: search.pkg ?? 'trial',
    tz: tz ?? base.tz,
    newStudent: student,
    country: guardianCountry({ phone_e164: search.phone ?? '' }),
  };
}

/**
 * /admin/book (R-SCH-06): from a student profile «احجز حلقات» (student + siblings), from a lead
 * row «حجز حلقة تجريبية» or the chat's «اشترك» (new student + guardian, R-LEAD-06), or bare
 * (search a student first).
 */
export function BookingPage({ search, onOpenStudent }: BookingPageProps) {
  // The title follows the package the admin has picked: «تجريبية» only while it is the free trial.
  const [picked, setPicked] = useState<{ from: BookingDraft['pkg'] | undefined; pkg: BookingDraft['pkg'] } | null>(null);
  const pkg = picked && picked.from === search.pkg ? picked.pkg : (search.pkg ?? 'trial');
  const setPkg = (next: BookingDraft['pkg']) => setPicked({ from: search.pkg, pkg: next });
  const trial = !!search.leadId && pkg === 'trial';
  const hint = bookHint(search);
  const hintKey = [hint?.teacherId, hint?.startsAt].join('-');
  return (
    <>
      <PageHead>
        <Cartouche>{trial ? t.booking.trialTitle : t.booking.title}</Cartouche>
      </PageHead>
      {search.studentId ? (
        <StudentBooking studentId={search.studentId} onOpenStudent={onOpenStudent} hint={hint} onPackage={setPkg} />
      ) : search.leadId ? (
        <LeadBooking
          key={`${search.leadId}-${search.pkg ?? 'trial'}-${hintKey}`}
          search={search}
          onOpenStudent={onOpenStudent}
          hint={hint}
          onPackage={setPkg}
        />
      ) : (
        <BookingWizard
          key={`bare-${hintKey}`}
          initial={emptyDraft()}
          primary={null}
          siblings={[]}
          onOpenStudent={onOpenStudent}
          hint={hint}
          onPackage={setPkg}
        />
      )}
    </>
  );
}

interface WizardProps {
  onOpenStudent: (id: string) => void;
  /** A free gap's teacher + start from the calendar (?teacherId&startsAt). */
  hint: BookHint | null;
  onPackage: (pkg: BookingDraft['pkg']) => void;
}

/** The lead path, once the lead's qualification is in; without it step 1 starts from the URL. */
function LeadBooking({ search, onOpenStudent, hint, onPackage }: WizardProps & { search: BookSearch }) {
  const lead = useQuery({ ...leadByPhoneQuery(search.phone ?? ''), enabled: !!search.phone });
  if (lead.isPending && !!search.phone) return <p className="text-ink-3">{t.common.loading}</p>;
  const found = lead.data && lead.data.id === search.leadId ? lead.data : null;
  const initial = draftFromLead(search, found);
  return (
    <BookingWizard initial={initial} primary={null} siblings={[]} onOpenStudent={onOpenStudent} hint={hint} onPackage={onPackage} />
  );
}

/** The wizard for one student, once their profile (tz, program, siblings) and guardian are in. */
function StudentBooking({ studentId, onOpenStudent, hint, onPackage }: WizardProps & { studentId: string }) {
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
      hint={hint}
      onPackage={onPackage}
    />
  );
}
