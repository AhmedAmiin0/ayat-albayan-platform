import { participantMeta } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { stopRevokedShare } from './stop-revoked';

const guest = (sources: number[], sharing: boolean) => ({
  metadata: participantMeta('guest'),
  permissions: { canPublish: true, canPublishSources: sources },
  isScreenShareEnabled: sharing,
  setScreenShareEnabled: vi.fn(() => Promise.resolve()),
});

describe('stopRevokedShare', () => {
  it('stops a running share once the screen is no longer allowed', () => {
    const me = guest([1, 2], true);
    expect(stopRevokedShare(me)).toBe(true);
    expect(me.setScreenShareEnabled).toHaveBeenCalledWith(false);
  });

  it('leaves an allowed share, or no share, alone', () => {
    const allowed = guest([1, 2, 3, 4], true);
    const idle = guest([1, 2], false);
    expect([stopRevokedShare(allowed), stopRevokedShare(idle)]).toEqual([false, false]);
    expect(allowed.setScreenShareEnabled).not.toHaveBeenCalled();
  });
});
