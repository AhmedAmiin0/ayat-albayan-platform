import { notFound } from '@/common/http/errors';
import type { Db } from '@/common/db/db.module';
import { afterCursor } from '@/common/db/page';
import { MESSAGE_SELECT, NOT_A_REACTION, type ThreadMessageRow } from '@/modules/messaging/whatsapp';
import { check } from './check';

/** Messages a window shows above its hit (newer); older ones fill the rest of the page. */
const AROUND_NEWER = 20;

export const PAGE_SELECT = `${MESSAGE_SELECT}, lesson:lessons(starts_at, ends_at, status)` as const;

interface AroundInput {
  phone: string;
  around: string;
  limit: number;
}

interface Hit {
  id: string;
  created_at: string;
}

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

/**
 * One side of the window: a range scan of the phone's index from the hit's time; the older side
 * starts at the hit itself.
 */
function side(db: Db, input: { phone: string; hit: Hit; newer: boolean }) {
  const { phone, hit, newer } = input;
  const query = db.from('messages').select(PAGE_SELECT).eq('phone_e164', phone).or(NOT_A_REACTION);
  const spec = { column: 'created_at', ascending: newer, inclusive: !newer };
  return afterCursor(query, spec, { at: hit.created_at, id: hit.id });
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
