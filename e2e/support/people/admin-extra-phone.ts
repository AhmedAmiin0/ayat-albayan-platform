import { normalizeArabic } from '@ab/shared';
import { dropTeacher, insertTeacher } from './admin-extra';
import { seedLead } from '../core/messages';
import { withSql } from '../core/schedule';

// Four people with synthetic Saudi numbers for the phone-search spec (A14): the digit after the
// leading 5 says which kind (1 guardian, 2 lead, 3 job applicant, 4 teacher); six digits come
// from the clock so desktop, mobile and earlier runs never share a number.

export type Kind = 'guardian' | 'lead' | 'applicant' | 'teacher';
const KINDS: Kind[] = ['guardian', 'lead', 'applicant', 'teacher'];

export interface Person {
  kind: Kind;
  name: string;
  /** National digits, 9 of them: 5 + kind index + 6 clock digits + 0. */
  national: string;
}

export function people(stamp: string): Person[] {
  return KINDS.map((kind, i) => ({
    kind,
    // «77» is in every name: a two-digit term can only find them by name.
    name: `بحث 77 ${kind} ${stamp}`,
    national: `5${i + 1}${stamp}0`,
  }));
}

/** Inserts all four plus one inbound message for the lead (so it has an inbox thread). */
export async function seedPeople(list: Person[]): Promise<string> {
  const at = (kind: Kind): Person => list.find((p) => p.kind === kind) ?? (() => { throw new Error(kind); })();
  const e164 = (p: Person) => `+966${p.national}`;
  const g = at('guardian');
  await withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.guardians (name, phone_e164, country, tz)
      values (${g.name}, ${e164(g)}, 'SA', 'Asia/Riyadh') returning id`;
    await sql`insert into public.students (guardian_id, name, name_normalized, tz)
      values (${row?.id ?? ''}, ${`طالب ${g.name}`}, ${normalizeArabic(`طالب ${g.name}`)}, 'Asia/Riyadh')`;
    const a = at('applicant');
    await sql`insert into public.job_applicants (phone_e164, name) values (${e164(a)}, ${a.name})`;
  });
  const lead = at('lead');
  const leadId = await seedLead({ phone: e164(lead), name: lead.name });
  await withSql((sql) => sql`
    insert into public.messages (direction, phone_e164, lead_id, body)
    values ('inbound', ${e164(lead)}, ${leadId}, 'مرحبا')`);
  const t = at('teacher');
  return insertTeacher({ name: t.name, phone: e164(t) });
}

export async function dropPeople(list: Person[], teacherId: string): Promise<void> {
  const phones = list.map((p) => `+966${p.national}`);
  await dropTeacher(teacherId);
  await withSql(async (sql) => {
    await sql`delete from public.messages where phone_e164 = any(${phones})`;
    await sql`delete from public.leads where phone_e164 = any(${phones})`;
    await sql`delete from public.job_applicants where phone_e164 = any(${phones})`;
    await sql`delete from public.students where guardian_id in
      (select id from public.guardians where phone_e164 = any(${phones}))`;
    await sql`delete from public.guardians where phone_e164 = any(${phones})`;
  });
}
