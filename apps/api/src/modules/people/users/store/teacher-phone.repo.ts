import type { Db } from '@/common/db/db.module';
import { isUniqueViolation, maybe, pgError } from '@/common/db/errors';

// docs/46 A7: a teacher login without a phone takes the record's number unless someone holds it.

/** The number is free for this login: nobody else's profile and no guardian row has it. */
export const phoneIsFree = (holders: { profiles: number; guardians: number }): boolean =>
  holders.profiles === 0 && holders.guardians === 0;

async function holdersOf(db: Db, phone: string): Promise<{ profiles: number; guardians: number }> {
  const [p, g] = await Promise.all([
    db.from('profiles').select('id', { count: 'exact', head: true }).eq('phone_e164', phone),
    db.from('guardians').select('id', { count: 'exact', head: true }).eq('phone_e164', phone),
  ]);
  if (p.error) throw pgError(p.error);
  if (g.error) throw pgError(g.error);
  return { profiles: p.count ?? 0, guardians: g.count ?? 0 };
}

async function recordPhone(db: Db, teacherId: string): Promise<string | null> {
  const data = maybe(await db
    .from('teachers')
    .select('phone_e164')
    .eq('id', teacherId)
    .maybeSingle());
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
  // A unique clash means someone took the number meanwhile: the profile keeps none.
  if (error && !isUniqueViolation(error)) throw pgError(error);
}

/** teachers.phone_e164 is unique: a new teacher row cannot take a number a teacher row holds. */
export async function teacherHoldsPhone(db: Db, phone: string): Promise<boolean> {
  const { count, error } = await db
    .from('teachers')
    .select('id', { count: 'exact', head: true })
    .eq('phone_e164', phone);
  if (error) throw pgError(error);
  return (count ?? 0) > 0;
}
