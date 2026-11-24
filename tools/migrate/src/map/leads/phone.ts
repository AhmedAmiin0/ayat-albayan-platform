// Phones → E.164 (rule 7) plus the tz the number implies (rule 6: tz on every person). One rule
// for sheets and CRM: the sheet helpers phoneCell / tzForPhone, so a lead and a guardian with the
// same number always get the same E.164 and the same zone.
import { phoneCell, tzForPhone } from '../../sources/sheets/cells.ts';

export interface PhoneInfo {
  e164: string;
  tz: string;
}

/** A6 dummy numbers used for test rows. */
export const DUMMY_PHONES: ReadonlySet<string> = new Set(['+966500000000', '+966501234567']);

/** WhatsApp ids lack '+'; local forms are accepted; undefined when not E.164-able. */
export function toE164(raw: string | number | null | undefined): PhoneInfo | undefined {
  const p = phoneCell(raw ?? null);
  return p.ok ? { e164: p.e164, tz: tzForPhone(p.e164) } : undefined;
}
