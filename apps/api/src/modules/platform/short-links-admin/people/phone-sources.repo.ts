import type { Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import { pgError } from '@/common/db/errors';

export interface PhoneRow {
  profileId: string;
  phone: string;
}

type Source = (ids: string[]) => Promise<PhoneRow[]>;
interface Pair {
  profile: string | null;
  phone: string | null;
}

const rowsOf = (pairs: Pair[]): PhoneRow[] =>
  pairs.flatMap((p) => (p.profile && p.phone ? [{ profileId: p.profile, phone: p.phone }] : []));

function checked<T>(res: { data: T[] | null; error: Parameters<typeof dbError>[0] | null }): T[] {
  if (res.error) throw pgError(res.error);
  return res.data ?? [];
}

/**
 * Where a listed profile's WhatsApp number comes from, in order (the existing phone sources):
 * the login's own phone, its teacher row, its family (guardian) row, its student's family.
 */
export function phoneSources(db: Db): Source[] {
  return [
    async (ids) => {
      const res = await db.from('profiles').select('id, phone_e164').in('id', ids);
      return rowsOf(checked(res).map((r) => ({ profile: r.id, phone: r.phone_e164 })));
    },
    async (ids) => {
      const res = await db.from('teachers').select('profile_id, phone_e164').in('profile_id', ids);
      return rowsOf(checked(res).map((r) => ({ profile: r.profile_id, phone: r.phone_e164 })));
    },
    async (ids) => {
      const res = await db.from('guardians').select('profile_id, phone_e164').in('profile_id', ids);
      return rowsOf(checked(res).map((r) => ({ profile: r.profile_id, phone: r.phone_e164 })));
    },
    async (ids) => {
      const res = await db
        .from('students')
        .select('profile_id, guardian:guardians!inner(phone_e164)')
        .in('profile_id', ids);
      const pairs = checked(res).map((r) => ({
        profile: r.profile_id,
        phone: r.guardian.phone_e164,
      }));
      return rowsOf(pairs);
    },
  ];
}

const firstOf = <T>(rows: T[]): T | null => rows[0] ?? null;

/** The login holding this phone (profiles.phone_e164 is unique); null when none. */
export async function profileOfPhone(db: Db, phone: string): Promise<string | null> {
  const res = await db.from('profiles').select('id').eq('phone_e164', phone).limit(1);
  return firstOf(checked(res))?.id ?? null;
}

/** The family this number belongs to (main, second or a child's own: guardian_phones). */
export async function familyOfPhoneRow(db: Db, phone: string) {
  const res = await db
    .from('guardian_phones')
    .select('guardian:guardians!inner(id, profile_id)')
    .eq('phone_e164', phone)
    .limit(1);
  return firstOf(checked(res))?.guardian ?? null;
}

/** The login of the teacher whose record holds this phone. */
export async function teacherProfileOfPhone(db: Db, phone: string): Promise<string | null> {
  const res = await db.from('teachers').select('profile_id').eq('phone_e164', phone).limit(1);
  return firstOf(checked(res))?.profile_id ?? null;
}
