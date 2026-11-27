import type { LessonStatus } from '@ab/catalog';
import type { ChatListRef } from './chat-lists';
import type { MessageView } from './message-view';
import type { ThreadPeople } from './thread-people';
import type { ThreadView } from './thread-reads/thread-view.schemas';

// Phase 4 responses (docs/12 §4): snake_case rows like every API response; instants ISO-8601 UTC.

/** GET /threads/:phone: the thread (null if the phone has no messages) and a page of messages. */
export interface ThreadDetail {
  thread: ThreadView | null;
  /** Oldest → newest; `before` (an instant) pages back. */
  messages: MessageView[];
  has_more: boolean;
  /** First page only: the guardian's / teacher's next open lessons, for the template composer. */
  lessons: ThreadLesson[];
  /** First page: guardian, lead, students and packages (an older page: empty; read pages[0]). */
  people: ThreadPeople;
  /** The lists the chat is in (docs/22 §3): callers with inbox.lists only; absent otherwise. */
  lists?: ChatListRef[];
}

/** An upcoming lesson of the thread's person: its times fill a template's variables (rule 6). */
export interface ThreadLesson {
  id: string;
  starts_at: string;
  meeting_link: string | null;
  /** The guardian's own children in it (all students for a teacher). */
  student_names: string[];
  /** The recipient's tz (the guardian's, or the teacher's). */
  tz: string;
  /** scheduled or confirmed, for the reply note; both absent in an old cache. */
  status?: LessonStatus;
  ends_at?: string;
}
