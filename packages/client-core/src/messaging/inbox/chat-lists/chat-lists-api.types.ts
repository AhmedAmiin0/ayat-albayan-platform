import type { ChatList } from '@ab/shared';

export interface ChatListMember {
  id: string;
  phone: string;
  /** true puts the chat in the list (PUT), false takes it out (DELETE); both idempotent. */
  member: boolean;
}

export interface ChatListCalls {
  all: () => Promise<ChatList[]>;
  create: (name: string) => Promise<ChatList>;
  rename: (input: { id: string; name: string }) => Promise<ChatList>;
  remove: (id: string) => Promise<void>;
  setMember: (input: ChatListMember) => Promise<void>;
}
