import { searchDigits } from '@ab/shared';
import { orSafe } from '../guardians/http';

/** GET /teachers?search (R-TCH-01): phone digits (searchDigits), else the Arabic or English name. */
export function teacherSearchFilter(term: string): string | null {
  const digits = searchDigits(term);
  if (digits) return `phone_e164.ilike.*${digits}*`;
  const safe = orSafe(term);
  return safe ? `display_name_ar.ilike.*${safe}*,display_name_en.ilike.*${safe}*` : null;
}
