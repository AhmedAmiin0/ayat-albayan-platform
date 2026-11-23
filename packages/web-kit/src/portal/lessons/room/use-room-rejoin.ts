import type { RoomJoinResult } from '@ab/shared';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { RejoinState } from '#/classroom/index.ts';
import { classroomErrorText } from '#/classroom/index.ts';
import { errorCode } from '#/lib/http/index.ts';
import { portalApi } from '#/portal/api.ts';

export interface RejoinInput {
  first: RoomJoinResult;
  /** The lesson and student the card joined (none: the card's own button joins again). */
  ids: { lessonId: string; studentId: string } | null;
}

export interface RoomRejoin {
  join: RoomJoinResult;
  /** «ادخل مرة أخرى» straight from the closing screen, without the card. */
  rejoin: (() => void) | undefined;
  state: RejoinState & { endedForAll: boolean };
}

/** 410 lesson_ended: the teacher ended it for everyone, no way back in (the app's RoomXEnded). */
const endedForAll = (error: unknown): boolean => errorCode(error) === 'lesson_ended';

/**
 * The room overlay's own «ادخل مرة أخرى»: a fresh admission from the API (the old token may be
 * spent), the room again on success; a refusal stays on the closing screen in its own words, and
 * 410 lesson_ended turns it into the final «انتهت الحلقة».
 */
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
