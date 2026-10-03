import { leadQualificationSchema, type BookingRequest, type LeadSource } from '@ab/shared';

/** The lead row the booking started from (BookingQueries.lead). */
export type LeadFacts = { id: string; status: string; source: LeadSource | null; qualification: unknown };

type NewParts = Extract<BookingRequest, { newStudent: unknown }>;
const TEXT = ['level', 'memorized', 'goal', 'riwaya', 'notes'] as const;
const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/**
 * Lead → student (research-forms item 2): what «بيانات الطالب» captured and the lead's source fill
 * whatever the client left empty, so web, mobile and any other client carry it. The request's own
 * values win. The guardian-level answers (city, filled_by, relation, alt_phone, group_kind) stay on
 * leads.qualification: guardians has no column for them.
 */
export function withLeadFacts(req: NewParts, lead: LeadFacts | null): Pick<NewParts, 'newStudent' | 'guardian'> {
  const parsed = leadQualificationSchema.safeParse(lead?.qualification ?? {});
  const q = parsed.success ? parsed.data : {};
  const newStudent = { ...req.newStudent };
  for (const key of TEXT) if (blank(newStudent[key]) && !blank(q[key])) newStudent[key] = q[key];
  const guardian = blank(req.guardian.source) && lead?.source ? { ...req.guardian, source: lead.source } : req.guardian;
  return { newStudent, guardian };
}
