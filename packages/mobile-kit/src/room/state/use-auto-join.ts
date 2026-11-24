import { useEffect, useEffectEvent, useState } from 'react';
import type { RoomPhase } from '../model/room-phase';
import type { DeviceMemory, MediaWish } from '../model/room-types';

interface AutoJoinInput {
  phase: RoomPhase;
  devices: DeviceMemory;
  /** Opened from the lesson-started push: straight in with the microphone on. */
  direct: boolean;
  /** The family's room: the kept choice skips the preview (the staff see it every time). */
  remember: boolean;
  join: (wish: MediaWish) => void;
}

interface Entry {
  direct: boolean;
  remember: boolean;
}

/**
 * What an entry without the preview turns on; null = show the preview. The push: the microphone
 * on, the camera as last chosen (off when never chosen).
 */
function autoWish(entry: Entry, remembered: MediaWish | null): MediaWish | null {
  if (entry.direct) return { mic: true, cam: remembered?.cam ?? false };
  return entry.remember ? remembered : null;
}

const quietPreview = (phase: RoomPhase): boolean =>
  phase.step === 'preview' && phase.notice === null;

/** Preview first time only; only a missing permission is asked; each preview entry joins once. */
export function useAutoJoin({ phase, devices, direct, remember, join }: AutoJoinInput) {
  const [remembered, setRemembered] = useState<MediaWish | null | undefined>(undefined);
  useEffect(() => {
    let live = true;
    void devices.load().then((wish) => {
      if (live) setRemembered(wish);
    });
    return () => {
      live = false;
    };
  }, [devices]);
  const enter = useEffectEvent((wish: MediaWish) => join(wish));
  useEffect(() => {
    const wish = remembered === undefined ? null : autoWish({ direct, remember }, remembered);
    if (wish && quietPreview(phase)) enter(wish);
  }, [phase, remembered, direct, remember]);
}
