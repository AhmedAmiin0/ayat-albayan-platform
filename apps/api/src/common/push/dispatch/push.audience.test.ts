import { systemPermissionsOf } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { AccountDisabledError, systemResolver, type PermissionResolver } from '../../auth/permissions';
import { fakePushDb, fakeWeb, flushPushes, pushService } from '../push.fakes';

const event = {
  subject: 'lead-1',
  vars: { name: 'أم سهيلة', text: 'السلام عليكم' },
  data: { phone: '+966500000001' },
};
const admins = [
  { id: 'sys', role: 'admin', push_tokens: [] },
  // An admin-base custom role whose grants leave out notifications.push.
  { id: 'custom', role: 'admin', push_tokens: ['ExponentPushToken[c]'] },
  {
    id: 'off',
    role: 'admin',
    push_tokens: ['ExponentPushToken[d]'],
    disabled_at: '2026-10-05T09:00:00Z',
  },
];
const resolve: PermissionResolver = async (user) =>
  user.id === 'custom'
    ? systemPermissionsOf('admin').filter((p) => p !== 'notifications.push')
    : systemResolver(user);
const rowsOf = (writes: { op: string; value: unknown }[]) =>
  writes
    .filter((w) => w.op === 'upsert')
    .map((w) => (w.value as { profile_id: string }).profile_id);

describe('PushAudience: who may get a notification, at send time (R-NOT-01)', () => {
  it('a disabled admin and a custom admin role without notifications.push get nothing; a system admin does', async () => {
    const { db, writes } = fakePushDb(admins);
    const { web, send } = fakeWeb();
    const transport = vi.fn(async () => []);
    await pushService(db, { web, transport, resolve }).notifyAdmins('new_lead', event);
    await flushPushes();
    expect(rowsOf(writes)).toEqual(['sys']);
    expect(send.mock.calls.map((c: unknown[]) => c[0])).toEqual(['sys']);
    expect(transport).not.toHaveBeenCalled();
  });

  it('notifyProfiles skips a disabled profile too (no bell row, no push)', async () => {
    const { db, writes } = fakePushDb(admins);
    const { web, send } = fakeWeb();
    await pushService(db, { web }).notifyProfiles({
      ...event,
      kind: 'new_student',
      profileIds: ['off', 'sys'],
    });
    await flushPushes();
    expect(rowsOf(writes)).toEqual(['sys']);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('an inbox kind also needs inbox.read: a role holding the bell but not the inbox', async () => {
    const { db, writes } = fakePushDb([{ id: 't1', role: 'teacher', push_tokens: [] }]);
    const svc = pushService(db, { resolve: async () => ['notifications.push'] });
    await svc.notifyProfiles({ ...event, kind: 'new_message', profileIds: ['t1'] });
    expect(rowsOf(writes)).toEqual([]);
    await svc.notifyProfiles({ ...event, kind: 'new_student', profileIds: ['t1'] });
    expect(rowsOf(writes)).toEqual(['t1']);
  });

  it('the resolver saying account_disabled (disabled meanwhile) = skipped, the others still notified', async () => {
    const { db, writes } = fakePushDb(admins.slice(0, 2));
    const racing: PermissionResolver = async (user) => {
      if (user.id === 'custom') throw new AccountDisabledError();
      return systemResolver(user);
    };
    await pushService(db, { resolve: racing }).notifyAdmins('new_lead', event);
    expect(rowsOf(writes)).toEqual(['sys']);
  });
});
