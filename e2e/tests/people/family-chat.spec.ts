import { ar, expect, test } from '../../support/core/fixtures';
import { AR_LOCALE } from '../../support/core/locale';
import { withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';
import { SINGLE_LINE } from '../../support/messaging/wa-lines';
import { closeCodes, openCodes } from '../../support/people/family-sign-in';
import { guardianSignIn, seedPortalFamily } from '../../support/people/family-portal';

// Family chat (docs/31 §2) with family_chat_enabled on; invented names only.

const C = ar.studentChannel;
const P = ar.portal;
const QUESTION = 'هل نبدأ بالصفحة الأولى في حلقة اليوم؟';
const ANSWER = 'نعم إن شاء الله';

/** The child subscribed with its lessons' teacher assigned (the chat opens), one teacher line. */
async function openChat(studentId: string): Promise<void> {
  await withSql(async (sql) => {
    await sql`update public.students s set status = 'active', teacher_id = (
        select l.teacher_id from public.lessons l
        join public.lesson_students ls on ls.lesson_id = l.id
        where ls.student_id = ${studentId} limit 1)
      where s.id = ${studentId}`;
    await sql`insert into public.channel_messages (channel_id, sender_role, body)
      select id, 'teacher', ${QUESTION} from public.student_channels where student_id = ${studentId}`;
  });
}

test.describe('the family chat on the family host', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so no sign-in codes');
  test.beforeEach(async () => {
    test.skip(test.info().project.name !== 'desktop', 'one browser: sign-in codes are rate limited');
    await stubReset();
    await openCodes();
    // A boolean parameter would reach jsonb as the string "true": the literal.
    await withSql((sql) => sql`insert into public.settings (key, value)
      values ('family_chat_enabled', 'true') on conflict (key) do update set value = 'true'`);
  });
  test.afterEach(async () => {
    await withSql((sql) => sql`delete from public.settings where key = 'family_chat_enabled'`);
    await closeCodes();
  });

  test('a guardian reads the teacher’s message and answers it with «ردّ»', async ({ browser }) => {
    test.setTimeout(120_000);
    const family = await seedPortalFamily();
    await openChat(family.first.id);
    const page = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await guardianSignIn(page, family.phone);
    const open = P.app.home.open.replace('{name}', family.first.name);
    await page.getByRole('article', { name: family.first.name }).getByRole('button', { name: open }).click();

    await page.getByRole('tab', { name: new RegExp(`^${P.app.child.chat}`) }).click();
    const chat = page.getByRole('region', { name: `${C.portalTab} · ${family.first.name}` });
    const question = chat.getByRole('listitem').filter({ hasText: QUESTION });
    await expect(question).toContainText(C.roles.teacher);

    await question.getByRole('button', { name: C.actions.menu }).click();
    await page.getByRole('button', { name: C.reply.action, exact: true }).click();
    await expect(chat.getByText(C.reply.replyingTo.replace('{name}', C.roles.teacher))).toBeVisible();
    // The message label also appears in the options menu and the quote, so match the box exactly.
    const box = chat.getByRole('textbox', { name: C.messageLabel, exact: true });
    await box.fill(ANSWER);
    await chat.getByRole('button', { name: C.send, exact: true }).click();

    const answer = chat.getByRole('listitem').filter({ hasText: ANSWER });
    await expect(answer.getByRole('button', { name: new RegExp(ar.inbox.reply.jump) })).toBeVisible();
    await expect(answer.getByRole('img', { name: C.sent })).toBeVisible();
    await expect(box).toHaveValue('');
    await page.context().close();
  });
});
