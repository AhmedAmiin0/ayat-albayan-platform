import { describe, expect, it } from 'vitest';
import { encodeSyncCursor, NIL_UUID, rewindSyncCursor, syncCursorSchema } from './sync-cursor.js';
import { SYNC_LIMIT_DEFAULT, SYNC_LIMIT_MAX, threadSyncQuerySchema } from './thread-sync.js';

const ID = 'c0000000-0000-4000-8000-0000000000a1';
const AT = '2026-11-06T10:00:00.123456+00:00';

describe('sync cursor and query (GET /threads/sync, docs/43 §5)', () => {
  it('round-trips Postgres microsecond text untouched', () => {
    const raw = encodeSyncCursor({ at: AT, id: ID });
    expect(syncCursorSchema.parse(raw)).toEqual({ at: AT, id: ID });
  });

  it('refuses a bare time, a bad id or extra parts', () => {
    for (const bad of [AT, `${AT}~x`, `yesterday~${ID}`, `${AT}~${ID}~1`])
      expect(syncCursorSchema.safeParse(bad).success).toBe(false);
  });

  it('rewinds 10 s to the nil id (every row at that instant again), and the nil id parses', () => {
    const back = rewindSyncCursor(encodeSyncCursor({ at: AT, id: ID }));
    expect(back).toBe(`2026-11-06T09:59:50.123Z~${NIL_UUID}`);
    expect(syncCursorSchema.parse(back).id).toBe(NIL_UUID);
  });

  it('limit: a default and a hard cap', () => {
    expect(threadSyncQuerySchema.parse({})).toEqual({ limit: SYNC_LIMIT_DEFAULT });
    expect(threadSyncQuerySchema.safeParse({ limit: String(SYNC_LIMIT_MAX + 1) }).success).toBe(
      false,
    );
    expect(threadSyncQuerySchema.parse({ limit: '5', since: `${AT}~${ID}` }).since?.id).toBe(ID);
  });
});
