import { systemPermissionsOf } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { systemResolver, type PermissionResolver } from '../auth/permissions';
import type { Db } from '../db/db.module';
import { fakePushDb, flushPushes, pushService } from './push.fakes';

const event = { subject: 'msg-1', vars: { name: 'أم سهيلة', text: 'السلام عليكم' }, data: { phone: '+966500000001' } };
const team = [
  { id: 'A', role: 'sales', push_tokens: [] },
  { id: 'B', role: 'sales', push_tokens: [] },
  { id: 'off', role: 'sales', push_tokens: [], disabled_at: '2026-10-05T09:00:00Z' },
  { id: 'noinbox', role: 'sales', push_tokens: [] },
  { id: 'adm', role: 'admin', push_tokens: [] },
];
const resolve: PermissionResolver = async (user) =>
  user.id === 'noinbox' ? systemPermissionsOf('sales').filter((p) => p !== 'inbox.read') : systemResolver(user);
const rowsOf = (writes: { op: string; value: unknown }[]) =>
  writes.filter((w) => w.op === 'upsert').map((w) => (w.value as { profile_id: string }).profile_id);

async function sales(owners: string[], opts: { duplicate?: boolean } = {}) {
  const { db, writes } = fakePushDb(team, opts);
  await pushService(db, { resolve }).notifySales('new_message', event, owners);
  await flushPushes();
  return { rows: rowsOf(writes), writes };
}

describe('PushService.notifySales: the owning assistant, else all (docs/21 §6)', () => {
  it('the owner only', async () => {
    expect((await sales(['A'])).rows).toEqual(['A']);
  });

  it('an admin owner: the admin row only (dedups against notifyAdmins), no sales rows', async () => {
    expect((await sales(['adm'])).rows).toEqual(['adm']);
  });

  it('a disabled owner: every enabled assistant permitted for the kind', async () => {
    expect((await sales(['off'])).rows).toEqual(['A', 'B']);
  });

  it('an owner without inbox.read: every assistant permitted for the kind', async () => {
    expect((await sales(['noinbox'])).rows).toEqual(['A', 'B']);
  });

  it('no owners: every enabled assistant', async () => {
    expect((await sales([])).rows).toEqual(['A', 'B']);
  });

  it('the dedup key is new_message:{subject}:{id}; a repeated call writes no new row', async () => {
    const first = await sales(['A']);
    expect(first.writes[0]?.value).toMatchObject({ dedup_key: 'new_message:msg-1:A', kind: 'new_message' });
    const again = await sales(['A'], { duplicate: true });
    expect(again.writes.filter((w) => w.op === 'update')).toEqual([]);
  });

  it('a throw from salesIds is swallowed', async () => {
    const db = { from: vi.fn(() => { throw new Error('db down'); }) } as unknown as Db;
    await expect(pushService(db).notifySales('new_lead', event, [])).resolves.toBeUndefined();
  });
});
