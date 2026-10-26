import { CHAT_LIST_LIMIT, chatListNameKey, type ChatList } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { conflict, notFound } from '../../../common/http/errors';
import { ChatListsQueries, type ListName } from './chat-lists.queries';

const named = (name: string): ListName => ({ name, name_key: chatListNameKey(name) });

/**
 * The academy's ONE shared set of chat lists (owner 2026-10-20, docs/22): names that only organise
 * chats. Duplicate names (ignoring case and Arabic letter variants) are 409 list_name_taken; the 31st
 * list is 409 list_limit. Nothing here ever sends a message.
 */
@Injectable()
export class ChatListsService {
  constructor(private readonly queries: ChatListsQueries) {}

  all(): Promise<ChatList[]> {
    return this.queries.all();
  }

  /** `name` is already trimmed and 1–30 characters (chatListBodySchema). */
  async create(name: string, by: string): Promise<ChatList> {
    if ((await this.queries.count()) >= CHAT_LIST_LIMIT) throw conflict('list_limit');
    const made = await this.queries.create({ ...named(name), created_by: by });
    if (made === 'taken') throw conflict('list_name_taken');
    if (made === 'limit') throw conflict('list_limit');
    return made;
  }

  async rename(id: string, name: string): Promise<ChatList> {
    const done = await this.queries.rename(id, named(name));
    if (done === 'taken') throw conflict('list_name_taken');
    const list = done ? await this.queries.one(id) : null;
    if (!list) throw notFound('list_not_found');
    return list;
  }

  /** Idempotent: an unknown (or already deleted) list is 204 too. */
  remove(id: string): Promise<void> {
    return this.queries.remove(id);
  }

  /** Adding twice is a no-op; 404 list_not_found for an unknown list. */
  async add(input: { listId: string; phone: string; by: string }): Promise<void> {
    await this.known(input.listId);
    if ((await this.queries.add(input)) === 'gone') throw notFound('list_not_found');
  }

  /** Removing a non-member is a no-op; 404 list_not_found for an unknown list. */
  async drop(listId: string, phone: string): Promise<void> {
    await this.known(listId);
    await this.queries.drop(listId, phone);
  }

  private async known(id: string): Promise<void> {
    if (!(await this.queries.one(id))) throw notFound('list_not_found');
  }
}
