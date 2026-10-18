import { ar, expect, test } from '../support/fixtures';
import { accessToken } from '../support/messages';
import { dropChatRows, importChatRows, listedKeys, RESTRICTED, sendAs } from '../support/restricted-templates';
import { resetAbrar, seedFamily, withSql } from '../support/schedule';
import { CHAT_PN, sentVia, SINGLE_LINE } from '../support/wa-lines';
import { setMessaging, stubInbound, stubReset } from '../support/wa-stub';

// Teacher mode and the restricted allow-list (owner 2026-10-12): «أبرار» lists and sends only
// the three defaults (free_trial_invite, welcome_greeting, trial_reschedule once approved), to her own families; the lesson reminders are no longer
// hers to send by hand (403 template_not_allowed; the automatic reminders are unchanged).

const KEY = 'free_trial_invite';
const WAIT = { timeout: 75_000, intervals: [1_000, 2_000, 5_000] };
const composer = ar.inbox.composer;

/** The family's child is Abrar's and active (a trial family is never in a teacher's chats). */
async function familyOf(teacherId: string, tag: string): Promise<string> {
  const family = await seedFamily(`أم جنى ${tag}`, [`جنى ${tag}`]);
  return withSql(async (sql) => {
    await sql`update public.students set teacher_id = ${teacherId}, status = 'active' where id in ${sql(family.studentIds)}`;
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${family.guardianId}`;
    if (!g) throw new Error('guardian missing');
    return g.phone_e164;
  });
}

test.describe('teacher mode: the restricted templates (owner 2026-10-12)', () => {
  test.skip(SINGLE_LINE, 'E2E_LINES=single: no chat line, so the restricted templates are never imported');
  test.afterEach(async () => {
    await setMessaging(false);
  });

  test('a teacher lists the three, sends free_trial_invite to her family, and may not send a lesson reminder', async ({ asRole }) => {
    test.setTimeout(150_000);
    await stubReset();
    await setMessaging(true);
    await dropChatRows();
    await importChatRows(await asRole('admin'));
    const abrar = await resetAbrar();
    const tag = String(Date.now()).slice(-4);
    const phone = await familyOf(abrar, tag);
    expect((await stubInbound({ from: phone.slice(1), name: `أم جنى ${tag}`, text: 'السلام عليكم' })).status).toBe(200);

    const teacher = await asRole('teacher');
    const token = await accessToken(teacher);
    expect([...(await listedKeys(token))].sort()).toEqual([...RESTRICTED].sort());
    expect(await sendAs({ token, phone, key: 'lesson_reminder_plain' })).toEqual({ status: 403, code: 'template_not_allowed' });

    await teacher.goto(`/teacher/inbox?phone=${encodeURIComponent(phone)}`);
    await expect(teacher.getByRole('log', { name: ar.messages.log })).toContainText('السلام عليكم');
    await teacher.getByRole('button', { name: composer.modeTemplate }).click();
    const select = teacher.getByLabel(composer.chooseTemplate);
    await expect(select.locator('option')).toHaveCount(1 + RESTRICTED.length);
    await select.selectOption({ label: KEY });
    await teacher.getByLabel(composer.param.replace('{n}', '1'), { exact: true }).fill(`أم جنى ${tag}`);
    await teacher.getByRole('button', { name: composer.sendTemplate, exact: true }).click();

    const digits = phone.slice(1);
    await expect.poll(async () => (await sentVia(CHAT_PN)).filter((m) => m.to === digits && m.template === KEY).length, WAIT).toBe(1);
    const rows = await withSql((sql) => sql<{ sent_by_teacher_id: string | null }[]>`
      select sent_by_teacher_id from public.messages where phone_e164 = ${phone} and template_key = ${KEY}`);
    expect(rows).toEqual([{ sent_by_teacher_id: abrar }]);
  });
});
