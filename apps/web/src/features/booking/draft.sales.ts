import type { BookingRequest } from '@ab/shared';
import { emptyDraft, toBookingRequest, type BookingDraft } from './draft';
import type { BookingMode } from './mode';

// The assistant's registration (base role sales): a new guardian + student and a trial, with or
// without a lead. Same wizard and body as the admin's; the sales route takes `leadId` as optional
// and no invoice (a trial is free, packages and their proof stay with the admin).

type Loose<R> = R extends unknown ? Omit<R, 'leadId'> & { leadId?: string | undefined } : never;
/** POST /booking's body, or the sales mirror's (the same, `leadId` optional). */
export type SalesBookingBody = Loose<BookingRequest>;

/** Step 1 opens on the new student form, with no lead behind it. */
export const registrationDraft = (): BookingDraft => ({
  ...emptyDraft({ trial: true }),
  newStudent: { name: '', guardianName: '', guardianPhone: '' },
});

// ponytail: toBookingRequest requires a lead for a new student; a placeholder satisfies it and is
// dropped here. Make `leadId` optional in the shared schema when the admin route needs it too.
const NO_LEAD = '00000000-0000-0000-0000-000000000000';

/** The request this wizard sends: the admin's as is; the assistant's without a lead id it never had. */
export function requestFor(mode: BookingMode, d: BookingDraft, override?: string): SalesBookingBody | null {
  if (mode === 'admin') return toBookingRequest(d, override);
  const body = toBookingRequest({ ...d, leadId: d.leadId ?? NO_LEAD }, override);
  if (!body || body.leadId !== NO_LEAD) return body;
  const rest: SalesBookingBody = { ...body };
  delete rest.leadId;
  return rest;
}
