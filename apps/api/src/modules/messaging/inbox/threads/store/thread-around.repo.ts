import { notFound } from '@/common/http/errors';
import type { Db } from '@/common/db/db.module';
import { MESSAGE_SELECT, NOT_A_REACTION, type ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { check } from './check';

/** Messages a window shows above its hit (newer); older ones fill the rest of the page. */
export const AROUND_NEWER = 20;

export const PAGE_SELECT = `${MESSAGE_SELECT}, lesson:lessons(starts_at, ends_at, status)` as const;

export interface AroundInput {
  phone: string;
  around: string;
  limit: number;
}

interface Hit {
  id: string;
  created_at: string;
}

/** PostgREST's quoted value: a timestamp holds `.` and `:` (reserved inside or=). */
export const quoted = (at: string): string => `"${at}"`;

async function hitOf(db: Db, input: AroundInput): Promise<Hit> {
  const { data, error } = await db
    .from('messages')
    .select('id, created_at')
    .eq('id', input.around)
    .eq('phone_e164', input.phone)
    .or(NOT_A_REACTION)
    .maybeSingle();
  check(error, 'thread window hit read');
  if (!data) throw notFound('message_not_found');
  return data;
}

/** One side of the window: a range scan of the phone's index from the hit's time (`gte`/`lte`). */
function side(db: Db, input: { phone: string; hit: Hit; newer: boolean }) {
  const { phone, hit, newer } = input;
  const at = quoted(hit.created_at);
  const query = db.from('messages').select(PAGE_SELECT).eq('phone_e164', phone).or(NOT_A_REACTION);
  const ranged = newer
    ? query.gte('created_at', hit.created_at).or(`created_at.gt.${at},and(created_at.eq.${at},id.gt.${hit.id})`)
    : query.lte('created_at', hit.created_at).or(`created_at.lt.${at},and(created_at.eq.${at},id.lte.${hit.id})`);
  return ranged.order('created_at', { ascending: !newer }).order('id', { ascending: !newer });
}

/**
 * GET /threads/:phone?around=<id> (docs/37 NEW 3): up to AROUND_NEWER newer messages (never more
 * than limit - 1, so the hit stays on the page), the hit, then older ones to fill `limit + 1`,
 * newest first like ThreadMessagesRepo.messages: the callers' slice(0, limit) and
 * has_more = rows > limit (older exist) stay right. 404 message_not_found when the id is not a
 * message of this chat. Three reads of messages_phone_idx, whatever the hit's depth.
 */
export async function aroundRows(db: Db, input: AroundInput): Promise<ThreadMessageRow[]> {
  const hit = await hitOf(db, input);
  const room = Math.min(AROUND_NEWER, Math.max(input.limit - 1, 0));
  const [newer, older] = await Promise.all([
    side(db, { phone: input.phone, hit, newer: true }).limit(room),
    side(db, { phone: input.phone, hit, newer: false }).limit(input.limit + 1),
  ]);
  check(newer.error, 'thread window newer read');
  check(older.error, 'thread window older read');
  const fill = older.data.slice(0, input.limit - newer.data.length + 1);
  return [...newer.data.reverse(), ...fill];
}
