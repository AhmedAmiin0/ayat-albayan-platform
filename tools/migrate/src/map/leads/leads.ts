// leads ← CRM contacts + tags first, «كل المحادثات» fills gaps (docs/06, R-MIG-01, R-LEAD-01/04).
// A guardian's or teacher's phone, or a job applicant's, gets no lead. Job-seeker wording in a
// contact's first messages is flagged for review only (never moved to job_applicants).
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { text } from '../../sources/crm/rows.ts';
import type { CrmRow, Mapped, RowIssue } from '../../types.ts';
import { type CrmContact, crmIndex, isTestRow } from './contacts.ts';
import { jobSeekerHints } from './job-seeker.ts';
import { type OtherPeople, notALead, otherPeople } from './links.ts';
import { crmLeadRecord, sheetLeadRecord } from './record.ts';
import { type SheetLead, sheetLeads } from './sheet-leads.ts';

const reject = (o: Omit<RowIssue, 'entity' | 'severity'>): RowIssue => ({
  entity: 'leads',
  severity: 'reject',
  ...o,
});

interface Ctx {
  people: OtherPeople;
  sheet: ReadonlyMap<string, SheetLead>;
  messages: ReadonlyMap<string, readonly CrmRow[]>;
}

function fromContact(c: CrmContact, ctx: Ctx): Mapped | undefined {
  if (!c.phone)
    return {
      ok: false,
      ref: c.ref,
      issues: [reject({ code: 'bad_phone', ref: c.ref, field: 'phone' })],
    };
  if (c.test) return { ok: false, ref: c.ref, issues: [reject({ code: 'test_row', ref: c.ref })] };
  if (notALead(ctx.people, c.phone.e164)) return undefined;
  const messages = ctx.messages.get(c.id) ?? [];
  const inbound = messages.filter((m) => text(m, 'sender_type') === 'customer');
  const hints = jobSeekerHints(inbound.flatMap((m) => text(m, 'content_text') ?? []));
  const issues: RowIssue[] = hints.length
    ? [
        {
          code: 'unmapped_value',
          severity: 'review',
          entity: 'leads',
          ref: c.ref,
          field: 'job_seeker',
          detail: `job-seeker wording (${hints.join(', ')}): move to job applicants?`,
        },
      ]
    : [];
  const sheet = ctx.sheet.get(c.phone.e164);
  const value = crmLeadRecord({ contact: { ...c, phone: c.phone }, sheet, messages, hints });
  return { ok: true, key: keys.lead(c.phone.e164), value, ref: c.ref, issues };
}

function fromSheet(s: SheetLead, people: OtherPeople): Mapped | undefined {
  if (s.status === 'job_applicant' || notALead(people, s.phone.e164)) return undefined;
  if (isTestRow({ name: s.name, phone: s.phone }))
    return { ok: false, ref: s.ref, issues: [reject({ code: 'test_row', ref: s.ref })] };
  return {
    ok: true,
    key: keys.lead(s.phone.e164),
    value: sheetLeadRecord(s),
    ref: s.ref,
    issues: [],
  };
}

export function mapLeads(bundle: SourceBundle): Mapped[] {
  const idx = crmIndex(bundle.crm);
  const sheet = sheetLeads(bundle);
  const ctx: Ctx = {
    people: otherPeople(bundle, sheet),
    sheet: sheet.byPhone,
    messages: idx.messages,
  };
  const out: Mapped[] = [];
  const inCrm = new Set<string>();
  for (const c of idx.contacts.values()) {
    if (c.phone) inCrm.add(c.phone.e164);
    const m = fromContact(c, ctx);
    if (m) out.push(m);
  }
  for (const [phone, s] of sheet.byPhone) {
    if (inCrm.has(phone)) continue;
    const m = fromSheet(s, ctx.people);
    if (m) out.push(m);
  }
  // Sheet rows with a bad phone or an unknown status: one entry per issue, no record.
  for (const i of sheet.issues) out.push({ ok: false, ref: i.ref, issues: [i] });
  return out;
}

export const leadsModule: EntityModule = {
  entity: 'leads',
  table: 'leads',
  /** A lead the app (webhook) already created for the phone is adopted, not overwritten. */
  adoptBy: 'phone_e164',
  map: mapLeads,
};
