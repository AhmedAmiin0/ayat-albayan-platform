import { z } from 'zod';
import { usedBeforeEditMax, type UsedBeforeEditInput } from './used-before-edit.js';

// GET /subscriptions/:id/lessons-used-before (review 2026-11-02): what the editor may offer before
// anything is typed: the stored number, the stepper's last value, and why it is refused outright
// (a cancelled package, a booked course), so web and mobile never offer a save the API refuses.

export const USED_BEFORE_BLOCKS = ['already_cancelled', 'used_before_course_booked'] as const;

export const usedBeforeStateSchema = z.object({
  subscription_id: z.string(),
  lessons_used_before: z.int(),
  max: z.int(),
  blocked: z.enum(USED_BEFORE_BLOCKS).nullable(),
});
export type UsedBeforeState = z.infer<typeof usedBeforeStateSchema>;

type StateInput = Omit<UsedBeforeEditInput, 'next'> & { id: string; current: number };

const BLOCKS: readonly [(typeof USED_BEFORE_BLOCKS)[number], (i: StateInput) => boolean][] = [
  ['already_cancelled', (i) => i.cancelled],
  ['used_before_course_booked', (i) => i.courseBooked],
];

/** The editor's state of one package. Pure. */
export function usedBeforeState(input: StateInput): UsedBeforeState {
  return {
    subscription_id: input.id,
    lessons_used_before: input.current,
    max: usedBeforeEditMax(input),
    blocked: BLOCKS.find(([, refused]) => refused(input))?.[0] ?? null,
  };
}
