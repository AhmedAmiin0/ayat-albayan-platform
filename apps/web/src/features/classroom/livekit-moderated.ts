import type { MuteSource } from '@ab/shared';
import { RoomEvent, type Room } from 'livekit-client';
import type { ModeratedEvent } from './room-types';

interface PubLike {
  source?: string | undefined;
}
interface WhoLike {
  isLocal?: boolean | undefined;
}

const SOURCES: Readonly<Record<string, MuteSource>> = { microphone: 'microphone', camera: 'camera' };

export interface ModerationWatch {
  /** Runs a mute / unmute the person asked for themselves: its TrackMuted is not the staff's. */
  self: (job: () => Promise<void>) => Promise<void>;
  on: (listener: (e: ModeratedEvent) => void) => () => void;
}

/**
 * A staff «كتم الميكروفون» (server MutePublishedTrack) reaches the muted person as TrackMuted on
 * their own publication, exactly like a self-mute: any local TrackMuted outside `self` is the staff's.
 */
export function watchModeration(room: Pick<Room, 'on'>): ModerationWatch {
  const listeners = new Set<(e: ModeratedEvent) => void>();
  let selfDepth = 0;
  room.on(RoomEvent.TrackMuted, (pub: PubLike, who: WhoLike) => {
    const source = SOURCES[pub.source ?? ''];
    if (!who.isLocal || selfDepth > 0 || !source) return;
    listeners.forEach((l) => l({ source }));
  });
  return {
    self: async (job) => {
      selfDepth += 1;
      try {
        await job();
      } finally {
        selfDepth -= 1;
      }
    },
    on: (listener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
