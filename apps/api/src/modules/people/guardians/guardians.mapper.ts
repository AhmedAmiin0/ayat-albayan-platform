import type { TablesInsert, TablesUpdate } from '@ab/db';
import { normalizePhone, searchDigits, type GuardianCreate, type GuardianUpdate } from '@ab/shared';
import { orSafe } from './http';

/** Country inferred from the E.164 number when the admin left it empty (R-STU-02). */
export function inferCountry(e164: string): string | null {
  const r = normalizePhone(e164);
  return r.ok ? r.country : null;
}

/** Validated DTO → row. Phone is already E.164 (shared `phoneE164` schema). */
export function toGuardianInsert(dto: GuardianCreate, actorId: string): TablesInsert<'guardians'> {
  return { ...dto, country: dto.country ?? inferCountry(dto.phone_e164), created_by: actorId };
}

export function toGuardianPatch(dto: GuardianUpdate): TablesUpdate<'guardians'> {
  if (!dto.phone_e164 || dto.country) return dto;
  return { ...dto, country: inferCountry(dto.phone_e164) };
}

/** PostgREST or() filter on name + phone_e164 (guardians, leads, job applicants): phone digits, else name. */
export function guardianSearchFilter(term: string): string | null {
  const digits = searchDigits(term);
  if (digits) return `phone_e164.ilike.*${digits}*`;
  const safe = orSafe(term);
  return safe ? `name.ilike.*${safe}*` : null;
}
