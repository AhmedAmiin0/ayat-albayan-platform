import type { Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

// docs/46 A7: a teacher login linked on «المستخدمون» without a phone takes the teacher record's
// number, unless another profile or a guardian row holds it («Shared numbers»: the family keeps its
// code sign-in; the teacher still signs in through her record). The backfill script applies the
// same rule.

/** The number is free for this login: nobody else's profile and no guardian row has it. */
export const phoneIsFree = (holders: { profiles: number; guardians: number }): boolean =>
  holders.profiles === 0 && holders.guardians === 0;

async function holdersOf(db: Db, phone: string): Promise<{ profiles: number; guardians: number }> {
  const [p, g] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('phone_e164', phone),
    db.from('guardians').select('id', { count: 'exact', head: true }).eq('phone_e164', phone),
  ]);
  if (p.error) throw dbError(p.error);
  if (g.error) throw dbError(g.error);
  return { profiles: p.count ?? 0, guardians: g.count ?? 0 };
}

/** A unique-index clash: someone took the number meanwhile, the profile keeps none. */
const lostRace = (error: { code?: string } | null): boolean => error?.code === '23505';

async function recordPhone(db: Db, teacherId: string): Promise<string | null> {
  const { data, error } = await db
    .from('teachers')
    .select('phone_e164')
    .eq('id', teacherId)
    .maybeSingle();
  if (error) throw dbError(error);
  return data?.phone_e164 ?? null;
}

/**
 * Copies the linked teacher's phone onto a profile that has none; a lost race (23505) keeps it
 * null.
 */
export async function adoptTeacherPhone(
  db: Db,
  ctx: { teacherId: string; profileId: string },
): Promise<void> {
  const phone = await recordPhone(db, ctx.teacherId);
  if (!phone || !phoneIsFree(await holdersOf(db, phone))) return;
  const { error } = await db
    .from('profiles')
    .update({ phone_e164: phone })
    .eq('id', ctx.profileId)
    .is('phone_e164', null);
  if (error && !lostRace(error)) throw dbError(error);
}
