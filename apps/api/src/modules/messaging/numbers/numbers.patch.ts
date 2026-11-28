import type { NumberUpdate } from '@ab/shared';
import { BadRequestException } from '@nestjs/common';
import type { NumberRow } from './numbers.repo';

/** A plain PATCH of wa_numbers (is_default true goes through wa_number_make_default instead). */
export type NumberPatch = Omit<NumberUpdate, 'is_default'> & { is_default?: false } & Partial<
  Pick<NumberRow, 'display_phone_e164' | 'health' | 'checked_at' | 'evolution_sync'>
>;

/**
 * The engine follows the provider (migration 20261106000700): leaving Evolution clears it;
 * moving to Evolution without one is refused (400 evolution_mode_needed).
 */
function evolutionFields(
  before: NumberRow,
  body: Omit<NumberUpdate, 'is_default'>,
): Partial<NumberPatch> {
  const provider = body.provider ?? before.provider;
  const mode = body.evolution_mode === undefined ? before.evolution_mode : body.evolution_mode;
  if (provider !== 'evolution') return mode === null ? {} : { evolution_mode: null };
  if (!mode) throw new BadRequestException({ message: 'evolution_mode_needed' });
  return {};
}

type PatchBody = Omit<NumberUpdate, 'is_default'>;

const phoneChanged = (before: NumberRow, body: PatchBody): boolean =>
  body.phone_number_id !== undefined && body.phone_number_id !== before.phone_number_id;

const purposeChanged = (before: NumberRow, body: PatchBody): boolean =>
  body.purpose !== undefined && body.purpose !== before.purpose;

/** A default that changes role or is switched off is no longer its role's default. */
const losesDefault = (before: NumberRow, body: PatchBody): boolean =>
  before.is_default && (purposeChanged(before, body) || body.enabled === false);

/** So a row never lies: a new phone id drops cached health; a role change unsets is_default. */
export function numberPatch(before: NumberRow, body: PatchBody): NumberPatch {
  const patch: NumberPatch = { ...body, ...evolutionFields(before, body) };
  if (phoneChanged(before, body)) {
    Object.assign(patch, {
      display_phone_e164: null, health: null, checked_at: null, evolution_sync: null,
    });
  }
  if (losesDefault(before, body)) patch.is_default = false;
  return patch;
}
