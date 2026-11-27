import { cardRoom } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { useState } from 'react';
import { useLessonStatusText } from '@ab/web-kit';
import type { Shown } from './NextLessonDetails.types';

export function useNextLessonDetails({ lesson, now, open, full }: Shown) {
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const chip = useLessonStatusText().chip(lesson.status);
  const state = cardRoom(lesson, now);
  const joinable = (full || open) && state.kind !== 'ended';
  const shown = { lesson, now, open, full };
  const leaveRoom = () => setRoom(null);
  return { room, setRoom, leaveRoom, chip, state, joinable, shown };
}
