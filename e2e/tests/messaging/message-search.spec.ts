import { ar, expect, test } from '../../support/core/fixtures';
import { freshDigits } from '../../support/core/messages';
import { resetAbrar } from '../../support/core/schedule';
import { bubble, openThread } from '../../support/messaging/inbox';
import {
  addMessage, familyOf, hitPhones, messageHit, searchChats, seedChat,
} from '../../support/messaging/message-search-ui';

// WhatsApp-style message search (owner 2026-11-06, docs/37): the chats list's «الرسائل» section,
// the folded match, the jump to a message 300 rows back in ONE anchored request, and the teacher's
// scope. Seeded straight into the DB (no send); example numbers and names only.

const S = ar.inbox.chatSearch;

test.describe('inbox — message search (docs/37)', () => {
  test('a word from a message shows «الرسائل»; a tap opens the chat at that bubble', async ({ asRole }) => {
    test.setTimeout(120_000);
    const word = `zqglobal${freshDigits().slice(-5)}`;
    const chat = await seedChat({ label: 'بحث عام', count: 3, oldest: `موعد ${word} غدًا` });
    const page = await asRole('admin');
    await page.goto('/admin/inbox');
    await searchChats(page, word);
    await expect(page.getByRole('heading', { name: ar.inbox.messageSearch.section })).toBeVisible({ timeout: 30_000 });
    await messageHit(page, chat.name).click();
    await expect(page).toHaveURL(/msg=/);
    const log = page.getByRole('log', { name: ar.messages.log });
    await expect(bubble(log, word)).toBeInViewport({ timeout: 30_000 });
  });

  test('folded: مدرسه finds المدرسة', async ({ asRole }) => {
    const tag = `zqfold${freshDigits().slice(-5)}`;
    const chat = await seedChat({ label: 'بحث مطوي', count: 2, oldest: `المدرسة ${tag}` });
    const page = await asRole('admin');
    await page.goto('/admin/inbox');
    await searchChats(page, `مدرسه ${tag}`);
    await expect(messageHit(page, chat.name)).toBeVisible({ timeout: 30_000 });
  });

  test('a hit 300 messages back opens in one anchored request; «الانتقال إلى أحدث رسالة» returns', async ({ asRole }) => {
    test.setTimeout(150_000);
    const word = `zqdeep${freshDigits().slice(-5)}`;
    const chat = await seedChat({ label: 'بحث عميق', count: 300, oldest: `أقدم رسالة ${word}` });
    const newest = `أحدث رسالة ${word.slice(-5)}`;
    await addMessage(chat.phone, newest);
    const page = await asRole('admin');
    const log = await openThread(page, chat.name);
    await expect(bubble(log, newest)).toBeVisible({ timeout: 30_000 });
    const around: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('around=')) around.push(r.url());
    });
    await page.getByRole('button', { name: S.open }).first().click();
    await page.getByRole('searchbox', { name: S.label, exact: true }).fill(word);
    await expect(page.getByText(S.counter.replace('{n}', '1').replace('{m}', '1'))).toBeVisible({ timeout: 30_000 });
    await expect(bubble(log, word)).toBeInViewport({ timeout: 30_000 });
    expect(around).toHaveLength(1);
    await page.getByRole('button', { name: ar.inbox.jumpLatest }).click();
    await expect(bubble(log, newest)).toBeInViewport({ timeout: 30_000 });
  });

  test('a teacher never gets a hit from a chat outside her scope', async ({ asRole }) => {
    const abrar = await resetAbrar();
    const tag = freshDigits().slice(-5);
    const word = `zqscope${tag}`;
    const mine = await familyOf(abrar, tag);
    await addMessage(mine, `واجب ${word}`);
    const other = await seedChat({ label: 'خارج النطاق', count: 1, oldest: `واجب ${word}` });
    const teacher = await asRole('teacher');
    expect(await hitPhones(teacher, word)).toEqual([mine]);
    expect(await hitPhones(await asRole('admin'), word)).toEqual(expect.arrayContaining([mine, other.phone]));
  });
});
