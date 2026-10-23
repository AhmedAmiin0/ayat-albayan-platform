import type { NumberUpdate } from '@ab/shared';
import type { NumberRow } from './numbers.queries';

/** A plain PATCH of wa_numbers (is_default true goes through wa_number_make_default instead). */
export type NumberPatch = Omit<NumberUpdate, 'is_default'> & { is_default?: false } & Partial<
  Pick<NumberRow, 'display_phone_e164' | 'health' | 'checked_at'>
>;

/**
 * What a PATCH also changes so a row never says something false:
 * - a new phone id drops the phone, health and check time cached for the old one (#134 item 9);
 * - a role change or a disable unsets is_default, so the default never moves to the other role
 *   silently and a disabled ex-default can't collide with a newer default when re-enabled.
 */
export function numberPatch(before: NumberRow, body: Omit<NumberUpdate, 'is_default'>): NumberPatch {
  const patch: NumberPatch = { ...body };
  if (body.phone_number_id !== undefined && body.phone_number_id !== before.phone_number_id) {
    Object.assign(patch, { display_phone_e164: null, health: null, checked_at: null });
  }
  const purposeChanged = body.purpose !== undefined && body.purpose !== before.purpose;
  if (before.is_default && (purposeChanged || body.enabled === false)) patch.is_default = false;
  return patch;
}
