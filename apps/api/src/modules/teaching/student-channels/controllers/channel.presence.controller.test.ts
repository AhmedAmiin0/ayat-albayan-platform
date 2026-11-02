import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import type { PresenceService } from '@/modules/people/presence';
import type { ChannelAccess } from '@/modules/teaching/student-channels/channel-access';
import { ChannelPresenceController } from './channel.presence.controller';

const ST = '52000000-0000-4000-8000-000000000001';
const user = (role: AuthUser['role']): AuthUser => ({ id: 'p-1', email: null, role });

function controller() {
  const actor = { mode: 'monitor', studentId: ST, profileId: 'p-1', open: true } as const;
  const access = { monitor: vi.fn(async () => actor) };
  const presence = { channel: vi.fn(async () => ({ enabled: true, peers: [] })) };
  const ctl = new ChannelPresenceController(
    access as unknown as ChannelAccess,
    presence as unknown as PresenceService,
  );
  return { ctl, access, presence };
}

// docs/33 §2: the monitor route shows presence to the base role admin only.
describe('ChannelPresenceController.monitor', () => {
  it('the admin passes the chat check and gets the chat people', async () => {
    const { ctl, presence } = controller();
    await expect(ctl.monitor(ST, user('admin'))).resolves.toEqual({ enabled: true, peers: [] });
    expect(presence.channel).toHaveBeenCalledWith(expect.objectContaining({ participant: false }));
  });

  it('a custom monitor (any other base role) sees nobody: 403, nothing read', async () => {
    const { ctl, access, presence } = controller();
    await expect(ctl.monitor(ST, user('assistant'))).rejects.toMatchObject({ status: 403 });
    expect(access.monitor).toHaveBeenCalled();
    expect(presence.channel).not.toHaveBeenCalled();
  });
});
