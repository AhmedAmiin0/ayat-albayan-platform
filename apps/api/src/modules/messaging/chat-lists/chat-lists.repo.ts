import { type ChatList, type ChatListRef, isChatListAutoRule } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { PostgrestError } from '@supabase/supabase-js';
import { DB, type Db } from '@/common/db/db.module';

/** What a write ran into: a taken name_key (23505) or the 30-list cap trigger (chat_lists_cap, 23514). */
export type ListClash = 'taken' | 'limit';

export interface ListName {
  name: string;
  name_key: string;
}

type CountedRow = { id: string; name: string; auto_rule: string | null; members: { count: number }[] };

const COUNTED = 'id, name, auto_rule, members:chat_list_threads(count)' as const;

function check(error: PostgrestError | null, what: string): void {
  if (error) throw new Error(`${what} failed: ${error.message}`);
}

function clashOf(error: PostgrestError | null): ListClash | null {
  if (error?.code === '23505') return 'taken';
  if (error?.code === '23514' && error.message.includes('at most 30 lists')) return 'limit';
  return null;
}

/** `auto_rule` (migration 20261025000710): an unknown value reads as a hand-kept list. */
const counted = (r: CountedRow): ChatList => ({
  id: r.id,
  name: r.name,
  count: r.members[0]?.count ?? 0,
  auto_rule: isChatListAutoRule(r.auto_rule) ? r.auto_rule : null,
});

/** chat_lists / chat_list_threads (migration 20261020000520), service role only (docs/22 §1). */
@Injectable()
export class ChatListsRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Every list, oldest first, with its member count. */
  async all(): Promise<ChatList[]> {
    const { data, error } = await this.db.from('chat_lists').select(COUNTED).order('created_at').order('id');
    check(error, 'chat lists read');
    return (data ?? []).map(counted);
  }

  async one(id: string): Promise<ChatList | null> {
    const { data, error } = await this.db.from('chat_lists').select(COUNTED).eq('id', id).maybeSingle();
    check(error, 'chat list read');
    return data ? counted(data) : null;
  }

  async count(): Promise<number> {
    const { count, error } = await this.db.from('chat_lists').select('id', { count: 'exact', head: true });
    check(error, 'chat lists count');
    return count ?? 0;
  }

  async create(row: ListName & { created_by: string }): Promise<ChatList | ListClash> {
    const { data, error } = await this.db.from('chat_lists').insert(row).select('id, name').single();
    const clash = clashOf(error);
    if (clash) return clash;
    check(error, 'chat list create');
    if (!data) throw new Error('chat list create returned no row');
    return { ...data, count: 0, auto_rule: null };
  }

  /** null = no such list. */
  async rename(id: string, name: ListName): Promise<'renamed' | 'taken' | null> {
    const { data, error } = await this.db.from('chat_lists').update(name).eq('id', id).select('id');
    if (clashOf(error) === 'taken') return 'taken';
    check(error, 'chat list rename');
    return data && data.length > 0 ? 'renamed' : null;
  }

  /** Its memberships go with it (on delete cascade); never a chat, message, lead or family. */
  async remove(id: string): Promise<void> {
    const { error } = await this.db.from('chat_lists').delete().eq('id', id);
    check(error, 'chat list delete');
  }

  /** Adding twice is a no-op. `gone` = the list was deleted meanwhile (23503: its FK), not a 500. */
  async add(input: { listId: string; phone: string; by: string }): Promise<'added' | 'gone'> {
    const row = { list_id: input.listId, phone_e164: input.phone, added_by: input.by };
    const { error } = await this.db.from('chat_list_threads').upsert(row, { onConflict: 'list_id,phone_e164', ignoreDuplicates: true });
    if (error?.code === '23503') return 'gone';
    check(error, 'chat list add');
    return 'added';
  }

  /** Removing a non-member is a no-op. */
  async drop(listId: string, phone: string): Promise<void> {
    const { error } = await this.db.from('chat_list_threads').delete().eq('list_id', listId).eq('phone_e164', phone);
    check(error, 'chat list remove');
  }

  /** The lists one chat is in, oldest list first (the thread header). */
  async listsOf(phone: string): Promise<ChatListRef[]> {
    const { data, error } = await this.db
      .from('chat_list_threads')
      .select('list:chat_lists!inner(id, name, created_at)')
      .eq('phone_e164', phone);
    check(error, 'chat lists of a chat read');
    return (data ?? [])
      .map((r) => r.list)
      .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
      .map(({ id, name }) => ({ id, name }));
  }
}
