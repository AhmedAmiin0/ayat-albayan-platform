import type { ChatList, chatListThreadParamsSchema } from '@ab/shared';
import type { z } from 'zod';

export type ChatListThread = z.input<typeof chatListThreadParamsSchema>;

export interface ChatListCalls {
  all: () => Promise<ChatList[]>;
  create: (name: string) => Promise<ChatList>;
  rename: (input: { id: string; name: string }) => Promise<ChatList>;
  remove: (id: string) => Promise<void>;
  /** Both idempotent. */
  addThread: (params: ChatListThread) => Promise<void>;
  dropThread: (params: ChatListThread) => Promise<void>;
}
