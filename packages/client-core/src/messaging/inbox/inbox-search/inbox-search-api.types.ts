import type {
  ChatSearchPage,
  ChatSearchQuery,
  MessageSearchPage,
  MessageSearchQuery,
} from '@ab/shared';

export interface InboxSearchCalls {
  messages: (query: MessageSearchQuery) => Promise<MessageSearchPage>;
  chat: (params: { phone: string }, query: ChatSearchQuery) => Promise<ChatSearchPage>;
}
