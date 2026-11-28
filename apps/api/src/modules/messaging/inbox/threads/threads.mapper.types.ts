import type { ReopenChoice, ThreadNote } from '@ab/shared';
import type { lineEnvs } from '@/config/env/env';
import type { FamilyTag } from '@/modules/messaging/inbox/people/thread-people.mapper';
import type { ThreadRow } from './threads.mapper';

/** The family tags (null: none), and how a closed chat reopens (ReopenRequest.usable). */
export interface ThreadViewOpts {
  tag?: FamilyTag | null;
  reopenUsable?: ReopenChoice | null;
}

export type ListedRow = ThreadRow & ThreadNote & { last_unsupported?: boolean };
export type ChatLine = ReturnType<typeof lineEnvs>['chat'];
export interface ReplyAt {
  chatConfigured: boolean;
  now: Date;
}
