import { leadQualificationSchema, type BookingRequest } from '@ab/shared';
import type { LeadSource } from '@ab/catalog';

/** The lead row the booking started from (BookingQueries.lead). */
export type LeadFacts = {
  id: string;
  status: string;
  source: LeadSource | null;
  qualification: unknown;
  /** The lead's own WhatsApp number: its chat is one an invoice may be saved from. */
  phone_e164?: string;
};

type NewParts = Extract<BookingRequest, { newStudent: unknown }>;
const TEXT = ['level', 'memorized', 'goal', 'riwaya', 'notes'] as const;
const blank = (v: unknown) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

/** Lead answers fill what the client left empty; request values win. */
export function withLeadFacts(req: NewParts, lead: LeadFacts | null): Pick<NewParts, 'newStudent' | 'guardian'> {
  const parsed = leadQualificationSchema.safeParse(lead?.qualification ?? {});
  const q = parsed.success ? parsed.data : {};
  const newStudent = { ...req.newStudent };
  for (const key of TEXT) if (blank(newStudent[key]) && !blank(q[key])) newStudent[key] = q[key];
  const guardian =
    blank(req.guardian.source) && lead?.source
      ? { ...req.guardian, source: lead.source }
      : req.guardian;
  return { newStudent, guardian };
}
