import type { RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { RejoinState } from '@ab/web-kit/classroom/closing/RoomClosing';
import { classroomErrorText } from '@ab/web-kit/classroom/room/livekit/errors';
import { errorCode } from '@ab/web-kit/lib/http/error-code';
import { portalApi } from '@ab/web-kit/portal/api';

export interface RejoinInput {
  first: RoomJoinResult;
  /** The lesson and student the card joined (none: the card's own button joins again). */
  ids: { lessonId: string; studentId: string } | null;
}

export interface RoomRejoin {
  join: RoomJoinResult;
  /** Rejoin straight from the closing screen, without the card. */
  rejoin: (() => void) | undefined;
  state: RejoinState & { endedForAll: boolean };
}

/** 410 lesson_ended: the teacher ended it for everyone, no way back in (the app's RoomXEnded). */
const endedForAll = (error: unknown): boolean => errorCode(error) === 'lesson_ended';

/** A fresh admission since the old token may be spent; 410 lesson_ended makes the end final. */
export function useRoomRejoin({ first, ids }: RejoinInput): RoomRejoin {
  const [join, setJoin] = useState(first);
  const again = useMutation({
    mutationFn: (to: { lessonId: string; studentId: string }) => portalApi.join(to),
    onSuccess: setJoin,
  });
  const ended = again.isError && endedForAll(again.error);
  const note = again.isError && !ended ? classroomErrorText(again.error) : null;
  return {
    join,
    rejoin: ids ? () => again.mutate(ids) : undefined,
    state: { busy: again.isPending, note, endedForAll: ended },
  };
}
