import type { Gender } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { FormAlert } from '@/components/ui/form-alert';
import { leadByPhoneQuery, type InboxLead } from '@/features/inbox/api';
import { studentQuery } from '@/features/students/api';
import type { StudentProfile } from '@/features/students/types';
import { t } from '@/lib/i18n';
import { guardianQuery, type BookSearch, type GuardianRow } from './api';
import { BookingWizard, type BookingWizardProps } from './BookingWizard';
import { emptyDraft, type BookingDraft } from './draft';
import type { BookHint } from './hint';
import { newStudentFromLead } from './new-student';
import { guardianCountry } from './price';

/** GET /students/:id returns every column; the gender preference is one of them (migration 070). */
type ProfileWithPref = StudentProfile & { teacher_gender_pref?: Gender | null };

/** A student's own wizard: their zone, program, preference, price currency and chat number prefill it. */
export function draftFromStudent(s: ProfileWithPref, guardian: GuardianRow | undefined, kind: BookingDraft['kind'] = 'package'): BookingDraft {
  const owner = guardian ?? s.guardian;
  return {
    ...emptyDraft({ kind }),
    students: [{ id: s.id, name: s.name, code: s.code }],
    tz: s.tz,
    program: s.program,
    genderPref: s.teacher_gender_pref ?? null,
    country: guardianCountry(owner),
    chatPhone: owner.phone_e164,
  };
}

/**
 * A lead books a trial, unless «اشترك» in the chat asked for a regular package (R-SUB-01). What
 * «بيانات الطالب» captured and the lead's source prefill step 1 (research-forms item 2).
 */
export function draftFromLead(search: BookSearch, lead: InboxLead | null): BookingDraft {
  const pkg = search.pkg ?? 'trial';
  const base = emptyDraft({ leadId: search.leadId ?? null, kind: pkg === 'trial' ? 'trial' : 'package' });
  const { student, tz } = newStudentFromLead(lead, search);
  return {
    ...base,
    pkg,
    tz: tz ?? base.tz,
    newStudent: student,
    country: guardianCountry({ phone_e164: search.phone ?? '' }),
  };
}

export interface EntryProps extends Pick<BookingWizardProps, 'onOpenStudent' | 'onChoice'> {
  /** A free gap's teacher + start from the calendar (?teacherId&startsAt). */
  hint: BookHint | null;
}

/** The lead path, once the lead's qualification is in; without it step 1 starts from the URL. */
export function LeadBooking({ search, onOpenStudent, hint, onChoice }: EntryProps & { search: BookSearch }) {
  const lead = useQuery({ ...leadByPhoneQuery(search.phone ?? ''), enabled: !!search.phone });
  if (lead.isPending && !!search.phone) return <p className="text-ink-3">{t.common.loading}</p>;
  const found = lead.data && lead.data.id === search.leadId ? lead.data : null;
  return (
    <BookingWizard initial={draftFromLead(search, found)} primary={null} siblings={[]} onOpenStudent={onOpenStudent} hint={hint} onChoice={onChoice} />
  );
}

/** The wizard for one student, once their profile (tz, program, siblings) and guardian are in. */
export function StudentBooking({ search, studentId, onOpenStudent, hint, onChoice }: EntryProps & { search: BookSearch; studentId: string }) {
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
      initial={draftFromStudent(s, guardian.data, search.kind)}
      primary={{ id: s.id, name: s.name, code: s.code }}
      siblings={s.siblings.filter((x) => x.id !== s.id)}
      onOpenStudent={onOpenStudent}
      hint={hint}
      onChoice={onChoice}
      missedLessonId={search.missedLessonId}
    />
  );
}
