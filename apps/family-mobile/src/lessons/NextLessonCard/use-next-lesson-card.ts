import { liveRoom } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { useNow } from '@ab/mobile-kit';
import { useFamilyClock } from '@/portal';

/** The countdown and the join button follow the clock every second. */
const TICK_MS = 1000;

export function useNextLessonCard(lesson: PortalLesson, student: PortalStudent) {
  const now = useNow(TICK_MS);
  const clock = { ...useFamilyClock(), tz: student.tz };
  const [notice, setNotice] = useState<string | null>(null);
  return { now, clock, notice, setNotice, live: liveRoom(lesson, now) };
}
