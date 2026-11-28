import { guardianUpdateSchema, type GuardianUpdate } from '@ab/shared';
import type { LeadSource } from '@ab/catalog';
import { phoneError, requiredError } from '@/features/people/students/create/create-student';
import { t } from '@ab/web-kit';
import type { GuardianDetail } from '@ab/shared';

/** Inputs hold strings; '' means not set. */
export interface GuardianValues {
  name: string;
  phone: string;
  country: string;
  source: LeadSource | '';
  notes: string;
}

export type GuardianErrors = Partial<Record<keyof GuardianValues, string>>;
export type GuardianPatchResult =
  | { ok: true; patch: GuardianUpdate }
  | { ok: false; errors: GuardianErrors };

export function guardianValues(g: GuardianDetail): GuardianValues {
  return {
    name: g.name,
    phone: g.phone_e164,
    country: g.country ?? '',
    source: g.source ?? '',
    notes: g.notes ?? '',
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** Values → PATCH /guardians/:id, validated with the API's schema (phone → E.164). */
export function guardianPatch(v: GuardianValues): GuardianPatchResult {
  const errors: GuardianErrors = {};
  const name = requiredError(v.name);
  const phone = phoneError(v.phone);
  if (name) errors.name = name;
  if (phone) errors.phone = phone;
  if (name || phone) return { ok: false, errors };
  const parsed = guardianUpdateSchema.safeParse({
    name: v.name.trim(),
    phone_e164: v.phone,
    country: orNull(v.country),
    source: v.source || null,
    notes: orNull(v.notes),
  });
  if (parsed.success) return { ok: true, patch: parsed.data };
  return { ok: false, errors: { notes: t.common.error } };
}
