import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { PresenceRepo } from './presence.repo';

const SEEN = '2026-10-30T09:00:00.000Z';

describe('PresenceRepo (migration 985)', () => {
  it('touches a batch through one RPC, none for an empty batch, loudly on an error', async () => {
    const { db, argsOf, trips } = fakeDb({
      'rpc:presence_touch': [{}, { error: { message: 'x' } }],
    });
    const repo = new PresenceRepo(db);
    await repo.touch([]);
    expect(trips).toEqual([]);
    await repo.touch(['u1', 'u2']);
    expect(argsOf('rpc:presence_touch', 'rpc')).toEqual([{ p_profiles: ['u1', 'u2'] }]);
    await expect(repo.touch(['u1'])).rejects.toThrow('last seen write failed');
  });

  it('reads last seen by profile, with no round trip for none', async () => {
    const { db, trips } = fakeDb({
      profile_presence: [{ data: [{ profile_id: 'u1', last_seen_at: SEEN }] }],
    });
    const repo = new PresenceRepo(db);
    expect(await repo.lastSeen([])).toEqual(new Map());
    expect(await repo.lastSeen(['u1', 'u2'])).toEqual(new Map([['u1', SEEN]]));
    expect(trips).toEqual(['profile_presence']);
  });

  it('names the channel people with a login: teachers, guardian, an own-contact student', async () => {
    const { db } = fakeDb({
      'rpc:channel_teacher_ids': [{ data: ['t1', 't2'] }],
      teachers: [{ data: [{ profile_id: 'p-t1' }, { profile_id: null }] }],
      students: [{ data: { guardian_id: 'g1', profile_id: 'p-s', contact_is_self: true } }],
      guardians: [{ data: { profile_id: 'p-g' } }],
    });
    expect(await new PresenceRepo(db).channelPeople('s1')).toEqual([
      { profile_id: 'p-t1', role: 'teacher' },
      { profile_id: 'p-g', role: 'guardian' },
      { profile_id: 'p-s', role: 'student' },
    ]);
  });

  it('leaves out a child login, a guardian without a login, and a channel with no teacher', async () => {
    const { db, trips } = fakeDb({
      'rpc:channel_teacher_ids': [{ data: [] }],
      students: [{ data: { guardian_id: 'g1', profile_id: 'p-c', contact_is_self: false } }],
      guardians: [{ data: { profile_id: null } }],
    });
    expect(await new PresenceRepo(db).channelPeople('s1')).toEqual([]);
    expect(trips).not.toContain('teachers');
  });

  it('lists active staff logins only', async () => {
    const staff = [{ id: 'p-ad', full_name: 'المدير', role: 'admin' }];
    const { db, calls } = fakeDb({ profiles: [{ data: staff }] });
    expect(await new PresenceRepo(db).staff()).toEqual(staff);
    const methods = calls.filter((c) => c.table === 'profiles').map((c) => [c.method, ...c.args]);
    expect(methods).toContainEqual(['in', 'role', ['admin', 'teacher', 'assistant', 'sales']]);
    expect(methods).toContainEqual(['is', 'disabled_at', null]);
  });
});
