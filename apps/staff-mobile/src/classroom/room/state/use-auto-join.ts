import { useEffect, useEffectEvent, useState } from 'react';
import type { RoomPhase } from '@/classroom/room/model/room-phase';
import type { DeviceMemory, MediaWish } from '@/classroom/room/model/room-types';

interface AutoJoinInput {
  phase: RoomPhase;
  devices: DeviceMemory;
  /** Opened from the «بدأت الحلقة» push: straight in with the microphone on. */
  direct: boolean;
  join: (wish: MediaWish) => void;
}

/** What an entry without the preview turns on; null = show the preview (the first time). */
export function autoWish(direct: boolean, remembered: MediaWish | null): MediaWish | null {
  if (direct) return { mic: true, cam: remembered?.cam ?? true };
  return remembered;
}

const quietPreview = (phase: RoomPhase): boolean =>
  phase.step === 'preview' && phase.notice === null;

/**
 * The preview the first time only (canvas RoomXPreview): later joins reuse the last device choice
 * and go straight in, and the «بدأت الحلقة» push joins with the microphone on. Only a missing
 * permission is asked first; a refused one still shows the preview with its notice. Each entry
 * into the preview (the first check, a pressed «حاول مرة أخرى») joins at most once.
 */
export function useAutoJoin({ phase, devices, direct, join }: AutoJoinInput) {
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
    const wish = remembered === undefined ? null : autoWish(direct, remembered);
    if (wish && quietPreview(phase)) enter(wish);
  }, [phase, remembered, direct]);
}
