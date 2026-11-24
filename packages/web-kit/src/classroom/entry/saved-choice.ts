import { z } from 'zod';
import type { MediaChoice } from '@ab/web-kit/classroom/room/components/room-types';

/** This browser's last pre-join choice (a per-viewer convenience: blocked storage means none). */
export const MEDIA_CHOICE_KEY = 'ab.classroom.media';

const choiceSchema = z.object({
  mic: z.boolean(),
  cam: z.boolean(),
  micId: z.string().optional(),
  camId: z.string().optional(),
});

const decodeJson: (text: string) => unknown = JSON.parse;
const storedSchema = z.string().transform((raw) => decodeJson(raw)).pipe(choiceSchema);

/** The stored JSON text (or nothing) → the choice; anything else is no choice. */
const parseChoice = (raw: string | null): MediaChoice | null => {
  const parsed = storedSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

/** The saved choice, or null (never chosen, unreadable, or storage blocked). */
export function readSavedChoice(): MediaChoice | null {
  try {
    return parseChoice(localStorage.getItem(MEDIA_CHOICE_KEY));
  } catch {
    return null;
  }
}

/** A refused or missing device is never remembered as off, so the check shows again. */
export interface JoinPick {
  media: MediaChoice;
  remember: boolean;
}

export function saveChoice(choice: MediaChoice): void {
  try {
    localStorage.setItem(MEDIA_CHOICE_KEY, JSON.stringify(choice));
  } catch {
    // Storage blocked: the check simply shows again next time.
  }
}
