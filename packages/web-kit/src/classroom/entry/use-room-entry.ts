import { useState } from 'react';
import { BOTH_ON, type MediaChoice } from '@ab/web-kit/classroom/room/components/room-types';
import { readSavedChoice, saveChoice, type JoinPick } from './saved-choice';

export interface RoomEntry {
  /** null while the pre-join check is still on screen. */
  media: MediaChoice | null;
  /** Remembered unless a device had a problem, so the next join goes straight in. */
  choose: (pick: JoinPick) => void;
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
    choose: ({ media: next, remember }) => {
      if (remember) saveChoice(next);
      setMedia(next);
    },
  };
}
