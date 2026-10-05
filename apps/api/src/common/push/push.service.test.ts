import { describe, expect, it, vi } from 'vitest';
import type { Db } from '../db/db.module';
import type { ExpoTicket } from './expo-push';
import { PushService, type PushTransport } from './push.service';

type Admin = { id: string; push_tokens: string[] };

/** A minimal supabase-js double: profiles select, push_notifications upsert/update, profiles update. */
function fakeDb(admins: Admin[], opts: { duplicate?: boolean } = {}) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const from = vi.fn((table: string) => ({
    select: () => ({ eq: async () => ({ data: admins, error: null }) }),
    upsert: (value: unknown) => {
      writes.push({ table, op: 'upsert', value });
      return { select: async () => ({ data: opts.duplicate ? [] : [{ id: `row-${writes.length}` }], error: null }) };
    },
    update: (value: unknown) => {
      writes.push({ table, op: 'update', value });
      return { eq: async () => ({ error: null }) };
    },
  }));
  return { db: { from } as unknown as Db, writes };
}

const ok = (n: number): ExpoTicket[] => Array.from({ length: n }, (_, i) => ({ status: 'ok', id: `t${i}` }));
const event = { subject: 'lead-1', vars: { name: 'أم سهيلة', text: 'السلام عليكم' }, data: { phone: '+966500000001' } };

describe('PushService.notifyAdmins (R-MOB-01, rule 8)', () => {
  it('logs one row per admin keyed kind:subject:profile and pushes to their devices', async () => {
    const { db, writes } = fakeDb([{ id: 'a1', push_tokens: ['ExponentPushToken[x]'] }, { id: 'a2', push_tokens: [] }]);
    const transport = vi.fn<PushTransport>(async (m) => ok(m.length));
    await new PushService(db, transport).notifyAdmins('new_lead', event);
    const rows = writes.filter((w) => w.op === 'upsert').map((w) => w.value);
    expect(rows).toEqual([
      expect.objectContaining({ profile_id: 'a1', kind: 'new_lead', dedup_key: 'new_lead:lead-1:a1', title: 'رسالة من رقم جديد' }),
      expect.objectContaining({ profile_id: 'a2', dedup_key: 'new_lead:lead-1:a2' }),
    ]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0][0]).toMatchObject({ to: 'ExponentPushToken[x]', data: { kind: 'new_lead', phone: '+966500000001' } });
    expect(writes).toContainEqual(expect.objectContaining({ op: 'update', value: expect.objectContaining({ ticket_ids: ['t0'], error: null }) }));
  });

  it('a repeated event (row already there) pushes nothing', async () => {
    const { db } = fakeDb([{ id: 'a1', push_tokens: ['ExponentPushToken[x]'] }], { duplicate: true });
    const transport = vi.fn<PushTransport>(async (m) => ok(m.length));
    await new PushService(db, transport).notifyAdmins('new_lead', event);
    expect(transport).not.toHaveBeenCalled();
  });

  it('prunes a token Expo reports DeviceNotRegistered', async () => {
    const { db, writes } = fakeDb([{ id: 'a1', push_tokens: ['ExponentPushToken[old]', 'ExponentPushToken[new]'] }]);
    const transport: PushTransport = async () => [
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 't1' },
    ];
    await new PushService(db, transport).notifyAdmins('reminder_failed', { subject: 'm1', vars: {} });
    expect(writes).toContainEqual({ table: 'profiles', op: 'update', value: { push_tokens: ['ExponentPushToken[new]'] } });
  });

  it('never throws: a transport failure is only logged', async () => {
    const { db } = fakeDb([{ id: 'a1', push_tokens: ['ExponentPushToken[x]'] }]);
    const transport: PushTransport = async () => {
      throw new Error('expo down');
    };
    await expect(new PushService(db, transport).notifyAdmins('new_lead', event)).resolves.toBeUndefined();
  });

  it('an event title replaces the kind’s title (a reschedule request)', async () => {
    const { db, writes } = fakeDb([{ id: 'a1', push_tokens: [] }]);
    const titled = { ...event, title: 'طلب تغيير موعد من أم سهيلة' };
    await new PushService(db, vi.fn<PushTransport>()).notifyAdmins('new_message', titled);
    expect(writes[0]?.value).toMatchObject({ title: 'طلب تغيير موعد من أم سهيلة', body: 'السلام عليكم' });
  });
});
