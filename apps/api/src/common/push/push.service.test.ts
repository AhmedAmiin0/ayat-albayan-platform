import { describe, expect, it, vi } from 'vitest';
import { fakePushDb, fakeWeb, flushPushes, okTickets, pushService } from './push.fakes';
import type { PushTransport } from './push.service';

const event = { subject: 'lead-1', vars: { name: 'أم سهيلة', text: 'السلام عليكم' }, data: { phone: '+966500000001' } };
const admins = [
  { id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[x]'] },
  { id: 'a2', role: 'admin', push_tokens: [] },
  { id: 't1', role: 'teacher', push_tokens: ['ExponentPushToken[t]'] },
];

describe('PushService.notifyAdmins (R-MOB-01, rule 8)', () => {
  it('logs one row per admin keyed kind:subject:profile and pushes to their devices and browsers', async () => {
    const { db, writes } = fakePushDb(admins);
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyAdmins('new_lead', event);
    await flushPushes();
    const rows = writes.filter((w) => w.op === 'upsert').map((w) => w.value);
    expect(rows).toEqual([
      expect.objectContaining({ profile_id: 'a1', kind: 'new_lead', dedup_key: 'new_lead:lead-1:a1', title: 'رسالة من رقم جديد' }),
      expect.objectContaining({ profile_id: 'a2', dedup_key: 'new_lead:lead-1:a2' }),
    ]);
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0]?.[0][0]).toMatchObject({ to: 'ExponentPushToken[x]', data: { kind: 'new_lead', phone: '+966500000001' } });
    expect(writes).toContainEqual(expect.objectContaining({ op: 'update', value: expect.objectContaining({ ticket_ids: ['t0'], error: null }) }));
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenCalledWith('a1', expect.objectContaining({ url: '/admin/inbox?phone=%2B966500000001', tag: 'new_lead:lead-1' }));
  });

  it('a repeated event (row already there) pushes nothing, to the app or the browser', async () => {
    const { db } = fakePushDb(admins, { duplicate: true });
    const transport = vi.fn<PushTransport>(async (m) => okTickets(m.length));
    const { web, send } = fakeWeb();
    await pushService(db, { transport, web }).notifyAdmins('new_lead', event);
    await flushPushes();
    expect(transport).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('prunes a token Expo reports DeviceNotRegistered (its binding; the trigger updates the profile)', async () => {
    const { db, writes } = fakePushDb([{ id: 'a1', role: 'admin', push_tokens: ['ExponentPushToken[old]', 'ExponentPushToken[new]'] }]);
    const transport: PushTransport = async () => [
      { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      { status: 'ok', id: 't1' },
    ];
    await pushService(db, { transport, web: fakeWeb().web }).notifyAdmins('reminder_failed', {
      subject: 'm1',
      vars: {},
    });
    await flushPushes();
    // Never a rewrite of the profile's list: a token registered meanwhile must survive.
    expect(writes.filter((w) => w.table === 'profiles' && w.op === 'update')).toEqual([]);
    expect(writes).toContainEqual({ table: 'push_device_sessions', op: 'delete', value: ['ExponentPushToken[old]'] });
  });

  it('never throws: a transport failure is only logged', async () => {
    const { db } = fakePushDb(admins);
    const transport: PushTransport = async () => {
      throw new Error('expo down');
    };
    await expect(
      pushService(db, { transport, web: fakeWeb().web }).notifyAdmins('new_lead', event),
    ).resolves.toBeUndefined();
    await flushPushes();
  });

  it('an event title replaces the kind’s title (a reschedule request)', async () => {
    const { db, writes } = fakePushDb([{ id: 'a1', role: 'admin', push_tokens: [] }]);
    const titled = { ...event, title: 'طلب تغيير موعد من أم سهيلة' };
    await pushService(db, { transport: vi.fn<PushTransport>(), web: fakeWeb().web }).notifyAdmins(
      'new_message',
      titled,
    );
    await flushPushes();
    expect(writes[0]?.value).toMatchObject({
      title: 'طلب تغيير موعد من أم سهيلة',
      body: 'السلام عليكم',
    });
  });
});
