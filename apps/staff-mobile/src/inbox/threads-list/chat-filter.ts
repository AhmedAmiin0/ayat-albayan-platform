import type { LeadStatus, ThreadView } from '@ab/shared';
import { t } from '@ab/mobile-kit';
import type { ChatChoice } from '@/inbox/lists/components/ChatListChips';

/** Waiting-for-reply reads every chat and filters on the client (waitingForReply). */
interface ChoiceQuery {
  unread: boolean;
  list?: string;
  status?: LeadStatus;
}

export function choiceQuery(choice: ChatChoice): ChoiceQuery {
  if (choice === 'unread') return { unread: true };
  if (typeof choice !== 'object') return { unread: false };
  return 'list' in choice ? { unread: false, list: choice.list } : { unread: false, status: choice.stage };
}

/** Newest wait first, on the pages loaded so far. */
export function waitingForReply(items: readonly ThreadView[]): ThreadView[] {
  return items
    .filter((th) => th.last_direction === 'inbound')
    .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at));
}

/** docs/22: the empty-list title shows only when the list is truly empty, not under a search. */
export function threadsEmptyTitle(choice: ChatChoice, search: string): string {
  if (choice === 'unread') return t.inbox.emptyUnread;
  if (choice === 'waiting') return t.inbox.emptyWaiting;
  if (typeof choice === 'object' && 'stage' in choice) return t.inbox.emptyStage;
  return typeof choice === 'object' && search === '' ? t.inbox.lists.empty : t.inbox.empty;
}
