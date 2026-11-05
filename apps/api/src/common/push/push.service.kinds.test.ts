import { notificationEntry, PUSH_KIND_PERMISSIONS, PUSH_KINDS, type PushKind } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import type { PushTransport } from './push.service';

// Every staff kind whose catalogue channels include 'push' reaches a live bound device (app and
// browser), exactly as new_message does; a ['bell'] kind stays a bell row (owner 2026-11-03).

const pushes = (kind: PushKind) =>
  (notificationEntry(kind).channels as readonly string[]).includes('push');
const BELL_KINDS = PUSH_KINDS.filter((k) => PUSH_KIND_PERMISSIONS[k].length === 1 && pushes(k));
const BELL_ONLY = PUSH_KINDS.filter((k) => !pushes(k));
/** A system role holding each bell-only kind's permission. */
const HOLDER: Partial<Record<PushKind, string>> = {
  google_sync_alert: 'admin',
  commission_earned: 'sales',
};

function setup(role: string, opts: { dedup?: boolean } = {}) {
  const { db, writes } = fakePushDb(
    [{ id: 'p1', role, push_tokens: ['ExponentPushToken[p]'] }],
    opts,
  );
  const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
  const { web, send } = fakeWeb();
  const rows = () => writes.filter((w) => w.op === 'upsert');
  return { db, transport, web, send, rows };
}

const event = (kind: PushKind) => ({
  kind,
  subject: 's1',
  vars: { title: 't', when: 'w' },
  data: { meetingId: 'm1' },
  profileIds: ['p1'],
});

describe('PushService: the device push of every staff kind', () => {
  it('lists the BELL kinds and the bell-only ones', () => {
    expect(BELL_KINDS).toEqual(
      expect.arrayContaining([
        'meeting_invite',
        'payment_due',
        'new_student',
        'lesson_needs_confirmation',
      ]),
    );
    expect(BELL_ONLY.sort()).toEqual(['commission_earned', 'google_sync_alert']);
  });

  it.each(BELL_KINDS)('%s: the row, the app push and the browser push', async (kind) => {
    const s = setup('assistant');
    await pushService(s.db, { transport: s.transport, web: s.web }).notifyProfiles(event(kind));
    await flushPushes();
    expect(s.rows()).toHaveLength(1);
    expect(s.transport).toHaveBeenCalledWith([
      expect.objectContaining({
        to: 'ExponentPushToken[p]',
        data: expect.objectContaining({ kind }),
      }),
    ]);
    expect(s.send).toHaveBeenCalledWith('p1', expect.objectContaining({ tag: `${kind}:s1` }));
  });

  it.each(BELL_ONLY)('%s: the row only, no device push', async (kind) => {
    const s = setup(HOLDER[kind] ?? '');
    await pushService(s.db, { transport: s.transport, web: s.web }).notifyProfiles(event(kind));
    await flushPushes();
    expect(s.rows()).toHaveLength(1);
    expect(s.transport).not.toHaveBeenCalled();
    expect(s.send).not.toHaveBeenCalled();
  });

  it.each(PUSH_KINDS)('%s: a profile without the kind’s permission gets nothing', async (kind) => {
    const s = setup('assistant');
    await pushService(s.db, {
      transport: s.transport,
      web: s.web,
      resolve: async () => [],
    }).notifyProfiles(event(kind));
    await flushPushes();
    expect(s.rows()).toEqual([]);
    expect(s.transport).not.toHaveBeenCalled();
    expect(s.send).not.toHaveBeenCalled();
  });

  it.each(BELL_KINDS)('%s: the same subject twice is one row and one push', async (kind) => {
    const s = setup('assistant', { dedup: true });
    const push = pushService(s.db, { transport: s.transport, web: s.web });
    await push.notifyProfiles(event(kind));
    await push.notifyProfiles(event(kind));
    await flushPushes();
    // One dedup key: the unique index keeps one row; the repeat writes nothing and pushes nothing.
    expect(new Set(s.rows().map((w) => (w.value as { dedup_key: string }).dedup_key)).size).toBe(1);
    expect(s.transport).toHaveBeenCalledTimes(1);
    expect(s.send).toHaveBeenCalledTimes(1);
  });
});
