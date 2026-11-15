import { NO_REPLY_RIGHTS, type ReplyLesson, type ReplyRights, type ThreadLesson } from '@ab/shared';
import { createContext, useContext } from 'react';

/** Whose reschedule sheet opens: sales' one-lesson sheet or the admin's (replyRights). */
export type ReplyFlow = 'sales' | 'admin';

export interface ReplyMove {
  messageId: string;
  lesson: ReplyLesson;
  flow: ReplyFlow;
}

/** The open chat's reply-note actions (owner 2026-10-28); the default (no provider) offers none. */
export interface ReplyActionsValue {
  phone: string;
  /** pages[0].lessons: the family's next open lessons. */
  lessons: readonly ThreadLesson[];
  rights: ReplyRights;
  /** Replies whose lesson was moved from their «تغيير الموعد». */
  moved: readonly string[];
  openMove: (messageId: string, lesson: ReplyLesson) => void;
}

export const ReplyActionsContext = createContext<ReplyActionsValue>({
  phone: '',
  lessons: [],
  rights: NO_REPLY_RIGHTS,
  moved: [],
  openMove: () => undefined,
});

export const useReplyActions = (): ReplyActionsValue => useContext(ReplyActionsContext);

/** Outside the thread's key: its refetches and the poll must not drop what was moved here. */
export const replyMovedKey = (phone: string) => ['reply-moved', phone] as const;
