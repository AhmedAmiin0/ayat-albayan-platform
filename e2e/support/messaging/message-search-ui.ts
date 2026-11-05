import { messageSearchPageSchema } from '@ab/shared';
import type { Page } from '@playwright/test';
import { ar, expect } from '../core/fixtures';
import { API, accessToken, freshDigits, seedLead } from '../core/messages';
import { seedFamily, withSql } from '../core/schedule';

// Journeys of docs/37 (message search): chats seeded straight into the DB, the inbox search box
// and the in-chat search bar driven as staff do.

interface SeededChat {
  phone: string;
  name: string;
}

/** A lead's chat of `count` outbound rows a minute apart; `oldest` is the body of the first one. */
interface ChatSeed {
  label: string;
  count: number;
  oldest: string;
}

export async function seedChat(input: ChatSeed): Promise<SeededChat> {
  const digits = freshDigits();
  const phone = `+${digits}`;
  const name = `${input.label} ${digits.slice(-4)}`;
  await seedLead({ phone, name });
  await withSql((sql) => sql`
    insert into public.messages (direction, status, phone_e164, body, created_at)
    select 'outbound', 'sent', ${phone},
      case when g = ${input.count} then ${input.oldest} else 'رسالة عادية رقم ' || g end,
      now() - make_interval(mins => g)
    from generate_series(1, ${input.count}) g`);
  return { phone, name };
}

/** One more row in a chat (E.164), now. */
export async function addMessage(phone: string, body: string): Promise<void> {
  await withSql((sql) => sql`
    insert into public.messages (direction, status, phone_e164, body) values ('outbound', 'sent', ${phone}, ${body})`);
}

/** A family whose active child is taught by `teacherId`: its guardian's phone (in her scope). */
export async function familyOf(teacherId: string, tag: string): Promise<string> {
  const family = await seedFamily(`أم ريم ${tag}`, [`ريم ${tag}`]);
  return withSql(async (sql) => {
    await sql`update public.students set teacher_id = ${teacherId}, status = 'active' where id in ${sql(family.studentIds)}`;
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${family.guardianId}`;
    if (!g) throw new Error('guardian missing');
    return g.phone_e164;
  });
}

/** Types into the chats list's search box (debounced in the page). */
export async function searchChats(page: Page, q: string): Promise<void> {
  await page.getByRole('searchbox', { name: ar.common.search, exact: true }).first().fill(q);
}

/** The «الرسائل» section's hit for a chat name. */
export const messageHit = (page: Page, name: string) =>
  page.getByRole('region', { name: ar.inbox.messageSearch.section }).getByRole('button', { name: new RegExp(name) });

/** GET /threads/search as the page's signed-in user: the phones of the hits. */
export async function hitPhones(page: Page, q: string): Promise<string[]> {
  const res = await fetch(`${API}/threads/search?q=${encodeURIComponent(q)}`, {
    headers: { authorization: `Bearer ${await accessToken(page)}` },
  });
  expect(res.status).toBe(200);
  return messageSearchPageSchema.parse(await res.json()).items.map((h) => h.phone_e164);
}
