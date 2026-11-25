import { dbError } from '@/common/http/http';
import type { Db } from './db.module';

/**
 * A family found by one of its numbers. `phone_e164` is its MAIN number: notifications and password
 * codes go there.
 */
type FamilyOfPhone = { id: string; name: string; tz: string; phone_e164: string };

/** Phone is the primary key, so one number is one family; null for a non-family number. */
export async function familyOfPhone(db: Db, phone: string): Promise<FamilyOfPhone | null> {
  const { data, error } = await db
    .from('guardian_phones')
    .select('guardian:guardians!inner(id, name, tz, phone_e164)')
    .eq('phone_e164', phone)
    .maybeSingle();
  if (error) throw dbError(error);
  return data?.guardian ?? null;
}
