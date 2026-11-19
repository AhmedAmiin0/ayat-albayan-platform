import { useState } from 'react';
import { BOTH_ON, type MediaChoice } from '@ab/web-kit/classroom/room/components/room-types';
import { readSavedChoice, saveChoice } from './saved-choice';

export interface RoomEntry {
  /** What the room connects with; null while «قبل الدخول» is still on screen. */
  media: MediaChoice | null;
  /** «انضم الآن»: remembered, so the next join (and «ادخل مرة أخرى») goes straight in. */
  choose: (media: MediaChoice) => void;
}

/**
 * Whether the room opens on the device check first (the family, the first time on this browser:
 * like the app, a saved choice goes straight in) or connects at once (staff: both on).
 */
export function useRoomEntry(deviceCheck: boolean): RoomEntry {
  const [media, setMedia] = useState<MediaChoice | null>(() =>
    deviceCheck ? readSavedChoice() : BOTH_ON,
  );
  return {
    media,
    choose: (next) => {
      saveChoice(next);
      setMedia(next);
    },
  };
}
