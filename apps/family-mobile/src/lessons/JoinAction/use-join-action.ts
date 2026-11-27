import { lessonWait, lessonWaitText } from '@ab/client-core';
import { t, useTheme } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';
import type { JoinActionProps } from './JoinAction.types';

export function useJoinAction({ lesson, student, now, short = false }: JoinActionProps) {
  const { color } = useTheme();
  // On the lapis card the words are white; on a schedule row the error reads in the bad tone.
  const ink = short ? color.bad : color.onLapis;
  const clock = useFamilyClock();
  const wait = lessonWait(lesson, now);
  const words = { words: t.portal, clock: { ...clock, tz: student.tz } };
  const hint = wait && !short ? lessonWaitText(wait, lesson, words) : null;
  return { ink, hint, waiting: wait !== null };
}
