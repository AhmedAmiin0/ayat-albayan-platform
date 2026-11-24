import { mayShareScreen, type ParticipantLike } from '@ab/web-kit/classroom/room/livekit/snapshot';

export interface LocalShareLike extends Pick<ParticipantLike, 'permissions' | 'metadata' | 'isScreenShareEnabled'> {
  setScreenShareEnabled(on: boolean): Promise<unknown>;
}

/** LiveKit sometimes kept a revoked share on, so the guest's client stops it itself. */
export function stopRevokedShare(me: LocalShareLike): boolean {
  if (!me.isScreenShareEnabled || mayShareScreen(me)) return false;
  me.setScreenShareEnabled(false).catch(() => undefined);
  return true;
}
