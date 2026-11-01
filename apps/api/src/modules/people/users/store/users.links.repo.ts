import type { LinkCandidate, LinkedRecord, LinkKind } from '@ab/shared';
import type { PostgrestError } from '@supabase/supabase-js';
import type { Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';
import type { LinkTarget } from './users.store';

// The teachers / students / guardians rows a login links to. One small block per table: the
// column names differ (display_name_ar / name) and supabase-js types them per literal table.

const LIMIT = 20;
/** PostgREST `or(...)` filter syntax breaks on these. */
const safe = (q: string): string => q.replace(/[,()%_*\\]/g, ' ').trim();

const LINK_TABLE = {
  teacher: 'teachers',
  student: 'students',
  guardian: 'guardians',
} as const satisfies Record<LinkKind, string>;

export async function linkTarget(db: Db, kind: LinkKind, id: string): Promise<LinkTarget | null> {
  if (kind === 'teacher') {
    const { data, error } = await db.from('teachers').select('id, display_name_ar, profile_id').eq('id', id).maybeSingle();
    if (error) throw dbError(error);
    return data && { id: data.id, name: data.display_name_ar, hasLogin: data.profile_id !== null };
  }
  const table = kind === 'student' ? 'students' : 'guardians';
  const { data, error } = await db.from(table).select('id, name, profile_id').eq('id', id).maybeSingle();
  if (error) throw dbError(error);
  return data && { id: data.id, name: data.name, hasLogin: data.profile_id !== null };
}

/** Sets profile_id only while it is null; false = somebody linked it first. */
export async function link(db: Db, ctx: { kind: LinkKind; id: string; profileId: string }): Promise<boolean> {
  const { data, error } = await db.from(LINK_TABLE[ctx.kind]).update({ profile_id: ctx.profileId }).eq('id', ctx.id).is('profile_id', null).select('id');
  if (error) throw dbError(error);
  return data.length > 0;
}

/**
 * profiles.phone_e164 and teachers.phone_e164 are each unique (at most one row per phone). Taken =
 * another profile has it, or another teacher record has it while the profile `except` owns a teacher
 * record (the PATCH copies the phone to it).
 */
export async function phoneTaken(db: Db, ctx: { phone: string; except: string }): Promise<boolean> {
  const [p, t, mine] = await Promise.all([
    db.from('profiles').select('id').eq('phone_e164', ctx.phone),
    db.from('teachers').select('profile_id').eq('phone_e164', ctx.phone),
    db.from('teachers').select('id').eq('profile_id', ctx.except).maybeSingle(),
  ]);
  if (p.error) throw dbError(p.error);
  if (t.error) throw dbError(t.error);
  if (mine.error) throw dbError(mine.error);
  return p.data.some((r) => r.id !== ctx.except) || (mine.data !== null && t.data.some((r) => r.profile_id !== ctx.except));
}

export async function syncTeacher(db: Db, ctx: { profileId: string; patch: { display_name_ar?: string; phone_e164?: string | null } }): Promise<void> {
  const { error } = await db.from('teachers').update(ctx.patch).eq('profile_id', ctx.profileId);
  if (error) throw dbError(error);
}

export async function linkedOf(db: Db, profileId: string): Promise<LinkedRecord | null> {
  const [t, s, g] = await Promise.all([
    db.from('teachers').select('id, display_name_ar').eq('profile_id', profileId).maybeSingle(),
    db.from('students').select('id, name, code').eq('profile_id', profileId).maybeSingle(),
    db.from('guardians').select('id, name').eq('profile_id', profileId).maybeSingle(),
  ]);
  for (const r of [t, s, g]) if (r.error) throw dbError(r.error);
  if (t.data) return { kind: 'teacher', id: t.data.id, name: t.data.display_name_ar, code: null };
  if (s.data) return { kind: 'student', id: s.data.id, name: s.data.name, code: s.data.code };
  if (g.data) return { kind: 'guardian', id: g.data.id, name: g.data.name, code: null };
  return null;
}

interface Found<T> {
  data: T[] | null;
  error: PostgrestError | null;
}

/** The rows of a read; a database error throws. */
function rowsOf<T>({ data, error }: Found<T>): T[] {
  if (error) throw dbError(error);
  return data ?? [];
}

/** Per kind: records without a login, by name (students also by code, guardians by phone). */
const LINK_SOURCES = {
  teacher: async (db, term) => {
    const query = db.from('teachers').select('id, display_name_ar').is('profile_id', null)
      .order('display_name_ar').limit(LIMIT);
    const rows = rowsOf(await (term ? query.ilike('display_name_ar', `%${term}%`) : query));
    return rows.map((r) => ({ kind: 'teacher', id: r.id, name: r.display_name_ar, code: null }));
  },
  student: async (db, term) => {
    const query = db.from('students').select('id, name, code').is('profile_id', null)
      .order('name').limit(LIMIT);
    const search = `name.ilike.%${term}%,code.ilike.%${term}%`;
    const rows = rowsOf(await (term ? query.or(search) : query));
    return rows.map((r) => ({ kind: 'student', id: r.id, name: r.name, code: r.code }));
  },
  guardian: async (db, term) => {
    const query = db.from('guardians').select('id, name').is('profile_id', null)
      .order('name').limit(LIMIT);
    const search = `name.ilike.%${term}%,phone_e164.ilike.%${term}%`;
    const rows = rowsOf(await (term ? query.or(search) : query));
    return rows.map((r) => ({ kind: 'guardian', id: r.id, name: r.name, code: null }));
  },
} satisfies Record<LinkKind, (db: Db, term: string) => Promise<LinkCandidate[]>>;

/** Records without a login, matched by name (students also by AB-nnnn). */
export function candidates(
  db: Db,
  kind: LinkKind,
  q: string | undefined,
): Promise<LinkCandidate[]> {
  return LINK_SOURCES[kind](db, safe(q ?? ''));
}
