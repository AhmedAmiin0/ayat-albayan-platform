import type { Db } from '../db/db.module';

/**
 * The given auth sessions that are still live (migration 700's push_live_sessions: not ended, not
 * past not_after, the user neither banned nor deleted). A device push goes only to a token or a
 * browser bound to one of them: a session that ended without a sign-out reaching us hears nothing.
 */
export async function liveSessions(db: Db, ids: readonly (string | null)[]): Promise<Set<string>> {
  const wanted = [...new Set(ids.filter((id): id is string => id !== null))];
  if (wanted.length === 0) return new Set();
  const { data, error } = await db.rpc('push_live_sessions', { p_ids: wanted });
  if (error) throw new Error(error.message);
  return new Set(data);
}

/**
 * Each profile's app tokens that may get a push: on the profile, bound to that same profile
 * (push_device_sessions) and to a live session, and not contested (another profile asked for it
 * without its device key: the phone may have changed hands, migration 720). An unbound token (registered before migration 700,
 * or by the previous API) waits until the app registers it again on its next start. A failed lookup
 * means no device push (fail closed), never a lost bell row: the caller still writes those.
 */
export async function liveTokens<P extends { id: string; push_tokens: string[] }>(db: Db, profiles: readonly P[]): Promise<P[]> {
  const all = profiles.flatMap((p) => p.push_tokens);
  if (all.length === 0) return [...profiles];
  const { data, error } = await db.from('push_device_sessions').select('token, profile_id, session_id, contested_at').in('token', all);
  const none = () => profiles.map((p) => ({ ...p, push_tokens: [] }));
  if (error) return none();
  const live = await liveSessions(
    db,
    data.map((b) => b.session_id),
  ).catch(() => null);
  if (!live) return none();
  const ok = new Set(data.filter((b) => !b.contested_at && live.has(b.session_id)).map((b) => `${b.profile_id}|${b.token}`));
  return profiles.map((p) => ({ ...p, push_tokens: p.push_tokens.filter((t) => ok.has(`${p.id}|${t}`)) }));
}
