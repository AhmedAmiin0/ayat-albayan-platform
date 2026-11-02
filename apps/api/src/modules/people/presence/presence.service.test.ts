import type { UserRole } from '@ab/shared';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { fakePresence, SEEN } from './presence.fakes';
import type { PresenceRepo } from './presence.repo';
import { PresenceService } from './presence.service';
import type { PresenceSettings } from './presence.settings';

function service() {
  const f = fakePresence();
  const svc = new PresenceService(
    f.repo as unknown as PresenceRepo,
    f.settings as unknown as PresenceSettings,
  );
  return { svc, ...f };
}
const user = (role: UserRole, id = `p-${role}`): AuthUser => ({ id, email: null, role });
const seat = (viewer: AuthUser) => ({ viewer, studentId: 's1', participant: true, open: true });

describe('PresenceService.channel', () => {
  it('filters the chat by the rule, never the caller', async () => {
    const { svc } = service();
    const peers = async (v: AuthUser) =>
      (await svc.channel(seat(v))).peers.map((p) => p.profile_id);
    expect(await peers(user('guardian', 'p-g'))).toEqual(['p-t1']);
    expect(await peers(user('student', 'p-s'))).toEqual(['p-t1']);
    expect(await peers(user('teacher', 'p-t1'))).toEqual(['p-g', 'p-s']);
    expect(await peers(user('sales'))).toEqual(['p-g', 'p-s']);
    expect(await peers(user('admin'))).toEqual(['p-t1', 'p-g', 'p-s']);
    expect(await peers(user('assistant'))).toEqual([]);
  });

  it('carries the last seen, null when never seen', async () => {
    const { svc, repo } = service();
    repo.lastSeen.mockResolvedValueOnce(new Map());
    expect((await svc.channel(seat(user('admin')))).peers[0]?.last_seen_at).toBeNull();
    expect((await svc.channel(seat(user('admin')))).peers[0]?.last_seen_at).toBe(SEEN);
  });
});

describe('PresenceService.staff', () => {
  it('lists every staff login with its last seen, for the admin only', async () => {
    const { svc } = service();
    const res = await svc.staff(user('admin'));
    expect(res.enabled).toBe(true);
    expect(res.staff.map((s) => [s.profile_id, s.role, s.last_seen_at])).toEqual([
      ['p-ad', 'admin', SEEN],
      ['p-t1', 'teacher', SEEN],
      ['p-sa', 'sales', null],
    ]);
    for (const role of ['teacher', 'sales', 'assistant', 'guardian', 'student'] as const) {
      await expect(svc.staff(user(role))).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('shows nothing while presence_enabled is off', async () => {
    const { svc, settings, repo } = service();
    settings.enabled.mockResolvedValue(false);
    expect(await svc.staff(user('admin'))).toEqual({ enabled: false, staff: [] });
    expect(await svc.self()).toEqual({ enabled: false });
    expect(repo.staff).not.toHaveBeenCalled();
  });
});
