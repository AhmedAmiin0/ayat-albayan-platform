// Phones that belong to someone other than a lead. Guardians and teachers come from entities
// earlier in APPLY_ORDER (bundle.earlier); job applicants from the owner's own sheet labels.
import type { SourceBundle } from '../../entities/contract.ts';
import { toE164 } from './phone.ts';
import type { SheetLeads } from './sheet-leads.ts';

export interface OtherPeople {
  /** A guardian's phone: link to the guardian (messages.guardian_id), never a lead. */
  guardians: ReadonlySet<string>;
  teachers: ReadonlySet<string>;
  /** «توظيف / عرض خدمة» rows and «ردود التوظيف»: imported as job_applicants, never leads. */
  jobApplicants: ReadonlySet<string>;
}

function teacherPhones(bundle: Pick<SourceBundle, 'earlier'>): Set<string> {
  const teachers = new Set<string>();
  for (const d of bundle.earlier.get('teachers') ?? []) {
    const p = d.record.columns['phone_e164'];
    if (typeof p === 'string') teachers.add(p);
  }
  return teachers;
}

export function otherPeople(
  bundle: Pick<SourceBundle, 'earlier' | 'sheets'>,
  sheet: SheetLeads,
): OtherPeople {
  const guardians = new Set((bundle.earlier.get('guardians') ?? []).map((d) => d.key.key));
  const teachers = teacherPhones(bundle);
  const jobApplicants = new Set<string>();
  for (const [phone, lead] of sheet.byPhone)
    if (lead.status === 'job_applicant') jobApplicants.add(phone);
  for (const row of bundle.sheets['hub_job_replies'] ?? []) {
    const raw = row.fields['phone'];
    const p = toE164(typeof raw === 'boolean' ? null : raw);
    if (p) jobApplicants.add(p.e164);
  }
  return { guardians, teachers, jobApplicants };
}

/** Why a phone gets no lead, or undefined when it may be one. */
export function notALead(people: OtherPeople, e164: string): keyof OtherPeople | undefined {
  if (people.guardians.has(e164)) return 'guardians';
  if (people.teachers.has(e164)) return 'teachers';
  if (people.jobApplicants.has(e164)) return 'jobApplicants';
  return undefined;
}
