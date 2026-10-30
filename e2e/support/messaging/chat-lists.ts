import type { Page } from '@playwright/test';
import { ar } from '../core/fixtures';
import { withSql } from '../schedule';

// «القوائم» (docs/22): the chip row above the conversations and the database rows behind it.

const L = ar.inbox.lists;

/** The chip row («الكل», the lists, «قائمة جديدة»). */
export const listsRow = (page: Page) => page.getByRole('list', { name: L.rowLabel });

/** A list's chip (its name, then its count). */
export const listChip = (page: Page, name: string) => listsRow(page).getByRole('button', { name: new RegExp(`^${name}`) });

/** Creates a list from the chip row's «قائمة جديدة» dialog. */
export async function createListFromRow(page: Page, name: string): Promise<void> {
  await listsRow(page).getByRole('button', { name: L.new }).click();
  const dialog = page.getByRole('dialog', { name: L.new });
  await dialog.getByRole('textbox', { name: new RegExp(L.name) }).fill(name);
  await page.getByRole('button', { name: L.create, exact: true }).click();
}

/** Lists left by an earlier failed run of the same spec (names are unique ignoring case and letter forms). */
export async function dropListsLike(prefix: string): Promise<void> {
  await withSql((sql) => sql`delete from public.chat_lists where name like ${`${prefix}%`}`);
}

export async function listsNamed(prefix: string): Promise<{ name: string; members: string[] }[]> {
  return withSql((sql) => sql<{ name: string; members: string[] }[]>`select l.name,
      coalesce(array_agg(m.phone_e164) filter (where m.phone_e164 is not null), '{}') as members
    from public.chat_lists l left join public.chat_list_threads m on m.list_id = l.id
    where l.name like ${`${prefix}%`} group by l.id, l.name`);
}

export async function messageCount(phone: string): Promise<number> {
  const [row] = await withSql((sql) => sql<{ n: number }[]>`select count(*)::int as n from public.messages where phone_e164 = ${phone}`);
  return row?.n ?? 0;
}
