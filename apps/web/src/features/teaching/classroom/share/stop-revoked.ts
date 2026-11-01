import { mayShareScreen, type ParticipantLike } from '@/features/teaching/classroom/room/livekit/snapshot';

export interface LocalShareLike extends Pick<ParticipantLike, 'permissions' | 'metadata' | 'isScreenShareEnabled'> {
  setScreenShareEnabled(on: boolean): Promise<unknown>;
}

/**
 * «إيقاف مشاركة {name}»: LiveKit should unpublish a share whose source was taken away, but against a
 * real server the track sometimes stayed on. The guest's own client stops it as soon as its
 * permission no longer allows the screen. Returns whether it stopped one.
 */
export function stopRevokedShare(me: LocalShareLike): boolean {
  if (!me.isScreenShareEnabled || mayShareScreen(me)) return false;
  me.setScreenShareEnabled(false).catch(() => undefined);
  return true;
}
