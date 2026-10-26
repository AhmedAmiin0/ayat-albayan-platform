import type { OutboundTemplate } from '@ab/shared';
import type { Db } from '../../../common/db/db.module';
import { hashLinkToken, newLinkToken } from '../../classroom/join/join-link.token';
import { dbError } from '../../../common/http/http';
import { queuedRow, type QueuedMessage } from '../queued-row';
import type { RoomCandidate } from './reminders.links';

// The family's classroom link minted by the reminders job (a platform lesson, reminders.links.ts). It lives in
// the lesson_join_links row of (lesson, student), the same row a student-link join goes in by
// (migration 191), so a removal from the room (classroom_blocks.join_link_id) holds either way.

const UNIQUE_VIOLATION = '23505';

/** dedup_keys among `keys` already in messages: those links were minted and queued on an earlier tick. */
async function queuedKeys(db: Db, keys: readonly string[]): Promise<Set<string>> {
  const { data, error } = await db.from('messages').select('dedup_key').in('dedup_key', [...keys]);
  if (error) throw dbError(error);
  return new Set(data.flatMap((m) => (m.dedup_key ? [m.dedup_key] : [])));
}

async function findLink(db: Db, c: RoomCandidate): Promise<string | null> {
  const { data, error } = await db
    .from('lesson_join_links')
    .select('id')
    .match({ lesson_id: c.lessonId, student_id: c.studentId })
    .maybeSingle();
  if (error) throw dbError(error);
  return data?.id ?? null;
}

/**
 * The (lesson, student) row takes the new token (the previous one dies) and the room's close; it is
 * created when there is none. PostgREST cannot upsert on the partial unique index, hence find first.
 */
async function saveToken(db: Db, c: RoomCandidate, hash: string): Promise<void> {
  const fields = { token_hash: hash, expires_at: c.expiresAt };
  let id = await findLink(db, c);
  if (!id) {
    const { error } = await db.from('lesson_join_links').insert({ ...fields, lesson_id: c.lessonId, student_id: c.studentId });
    if (!error) return;
    // A student-link join created the row meanwhile (student-link.queries.ts): take it over.
    id = error.code === UNIQUE_VIOLATION ? await findLink(db, c) : null;
    if (!id) throw dbError(error);
  }
  const { error } = await db.from('lesson_join_links').update(fields).eq('id', id);
  if (error) throw dbError(error);
}

/**
 * This tick's lesson_join_link messages. A candidate whose key is already in messages went out (or
 * is queued) from an earlier tick: nothing is minted for it, so the 5-minute ticks pile up no rows.
 * Each other one gets a fresh token saved on its row first; only the message carries the token.
 * ponytail: check-then-queue relies on the job's single flight; two API instances could each mint
 * one, and the later save would kill the link the first one queued. One instance runs today.
 */
export async function roomLinkRows(db: Db, candidates: readonly RoomCandidate[], now: Date): Promise<QueuedMessage[]> {
  if (candidates.length === 0) return [];
  const done = await queuedKeys(db, candidates.map((c) => c.dedupKey));
  const rows: QueuedMessage[] = [];
  for (const c of candidates.filter((x) => !done.has(x.dedupKey))) {
    const token = newLinkToken();
    await saveToken(db, c, hashLinkToken(token));
    const template: OutboundTemplate = { key: 'lesson_join_link', params: { '1': c.name, button: token } };
    const to = { phone: c.phone, guardianId: c.guardianId, lessonId: c.lessonId };
    rows.push(queuedRow({ ...to, template, dedupKey: c.dedupKey, now, expiresAt: new Date(c.expiresAt) }));
  }
  return rows;
}
