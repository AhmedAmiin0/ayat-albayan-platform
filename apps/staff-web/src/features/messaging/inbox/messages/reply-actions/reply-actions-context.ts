import { NO_REPLY_RIGHTS, type ReplyLesson, type ReplyRights, type ThreadLesson } from '@ab/shared';
import { createContext, useContext } from 'react';

// What the reply notes of the open chat may offer (owner 2026-10-28): the family's next lessons, the
// viewer's rights, which replies' lessons she moved from their button, and how to open the move.

export interface ReplyActions {
  phone: string;
  /** ThreadDetail.lessons of the first page: the family's next open lessons. */
  lessons: readonly ThreadLesson[];
  rights: ReplyRights;
  /** Message ids whose lesson was moved from their «تغيير الموعد». */
  moved: readonly string[];
  /** Opens the reschedule drawer for `lesson`, remembered against `messageId` once it moves. */
  reschedule: (messageId: string, lesson: ReplyLesson) => void;
}

export const ReplyActionsContext = createContext<ReplyActions>({
  phone: '',
  lessons: [],
  rights: NO_REPLY_RIGHTS,
  moved: [],
  reschedule: () => undefined,
});

export const useReplyActions = (): ReplyActions => useContext(ReplyActionsContext);

/** Not under ['threads']: a send or a poll invalidates those, and this must outlive them. */
export const movedKey = (phone: string) => ['reply-moved', phone] as const;
