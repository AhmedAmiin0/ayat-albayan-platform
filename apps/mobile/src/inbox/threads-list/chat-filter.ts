import type { LeadStatus, ThreadView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import type { ChatChoice } from '@/inbox/lists/components/ChatListChips';

/** What GET /threads is asked for a choice; «بانتظار ردّك» reads every chat and filters here (waitingForReply). */
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

/**
 * «بانتظار ردّك» (review 2026-10-29 #3): the chats whose last message is the family's, the newest
 * wait first (a fresh ad lead is the warmest), on the pages loaded so far; the list pages on as she scrolls.
 */
export function waitingForReply(items: readonly ThreadView[]): ThreadView[] {
  return items
    .filter((th) => th.last_direction === 'inbound')
    .sort((a, b) => Date.parse(b.last_message_at) - Date.parse(a.last_message_at));
}

/**
 * The thread list's empty title. «لا محادثات في هذه القائمة بعد…» only when the active chat list
 * (docs/22) is really empty: with a search on top, the list may have chats.
 */
export function threadsEmptyTitle(choice: ChatChoice, search: string): string {
  if (choice === 'unread') return t.inbox.emptyUnread;
  if (choice === 'waiting') return t.inbox.emptyWaiting;
  if (typeof choice === 'object' && 'stage' in choice) return t.inbox.emptyStage;
  return typeof choice === 'object' && search === '' ? t.inbox.lists.empty : t.inbox.empty;
}
