import type { SalesScope } from '@/modules/sales/sales';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
  /** Teacher mode: the sending teacher's scope; null/absent = the admin. */
  scope?: TeacherScope | null;
  /** Sales mode: the sending salesperson (any chat, her own dedup space and audit). */
  sales?: SalesScope | null;
  /** No templates.send_all: the allow-list only (restrictedMay); absent: all. */
  restricted?: boolean;
  /** The message this copy was forwarded from (messages.forwarded_from_id). */
  forwardedFrom?: string;
  role?: string | null; // The sender's base role: an admin corrects anyone's text.
}
