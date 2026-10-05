import { EMPTY_STUDENT, type CreateStudentValues } from '@/features/students/create-student';
import { t } from '@/lib/i18n';
import type { InboxLead } from './api';
import { qualForm } from './qualification-form';

// The short aside of a lead thread: what is known about the student at a glance, and the same
// facts pre-filled into «تسجيل الطالب» (R-LEAD-03, R-STU-02).

export type SummaryRow = { label: string; value: string };

const CITY: Record<string, string | undefined> = t.tz;
const WEEKDAY: Record<string, string | undefined> = t.enums.weekday;

/** The lead's key facts, only the filled ones, in the registration form's order. */
export function leadSummary(lead: InboxLead): SummaryRow[] {
  const q = qualForm(lead.qualification);
  const tz = q.tz || lead.tz || '';
  const days = q.available_days.map((d) => WEEKDAY[String(d)] ?? String(d)).join(t.common.listSeparator);
  const hours = [q.preferred_from, q.preferred_to].filter(Boolean).join(' – ');
  const rows: SummaryRow[] = [
    { label: t.leads.studentName, value: q.student_name },
    { label: t.leads.studentAge, value: q.age },
    { label: t.leads.gender, value: q.gender ? t.enums.gender[q.gender] : '' },
    { label: t.guardians.name, value: q.guardian_name },
    { label: t.leads.country, value: q.country },
    { label: t.students.tz, value: tz ? (CITY[tz] ?? tz) : '' },
    { label: t.leads.availableDays, value: days },
    { label: t.leads.preferredTime, value: hours },
  ];
  return rows.filter((r) => r.value.trim() !== '');
}

/** «تسجيل الطالب» pre-filled from the lead; the thread's phone is the guardian's. */
export function registerInitial(lead: InboxLead): Partial<CreateStudentValues> {
  const q = qualForm(lead.qualification);
  return {
    name: q.student_name,
    guardianPhone: lead.phone_e164,
    guardianName: q.guardian_name || lead.name || '',
    age: q.age,
    gender: q.gender,
    tz: q.tz || lead.tz || EMPTY_STUDENT.tz,
    source: lead.source,
    program: 'quran',
  };
}
