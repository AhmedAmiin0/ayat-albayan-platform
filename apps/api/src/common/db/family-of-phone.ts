import { dbError } from '../http/http';
import type { Db } from './db.module';

/** A family found by one of its numbers. `phone_e164` is its MAIN number: notifications and sign-in codes go there. */
export type FamilyOfPhone = { id: string; name: string; tz: string; phone_e164: string };

/**
 * The family whose number this is, its main one or its second one (public.guardian_phones, owner 2026-10-29
 * «رقم ثانٍ للعائلة»); null for a lead, a teacher or an unknown number. The phone is the table's primary key,
 * so one number is one family. Every phone → family read of the chat goes through here.
 */
export async function familyOfPhone(db: Db, phone: string): Promise<FamilyOfPhone | null> {
  const { data, error } = await db
    .from('guardian_phones')
    .select('guardian:guardians!inner(id, name, tz, phone_e164)')
    .eq('phone_e164', phone)
    .maybeSingle();
  if (error) throw dbError(error);
  return data?.guardian ?? null;
}
