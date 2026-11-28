import { ar, expect, test } from '../../support/core/fixtures';
import { resetAbrar, riyadh, seedFamily, seedLesson, withSql } from '../../support/core/schedule';
import { stubReset } from '../../support/core/wa-stub';
import { stubInboundAnswerable } from '../../support/messaging/wa-lines';

// Teacher mode (R-TCH-03, R-MSG-05): other threads give 403 not_your_thread from the API.

const openThread = (name: string) => ar.inbox.openThread.replace('{name}', name);

/**
 * Her calendar opens on her own week (the e2e teacher's zone is Africa/Cairo), so today is read in
 * that zone: Riyadh is already on Saturday, the next week, for an hour each Friday night.
 */
const teacherToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });

/** A second, login-less teacher for the other family. */
async function seedOtherTeacher(name: string): Promise<string> {
  return withSql(async (sql) => {
    const [row] = await sql<{ id: string }[]>`
      insert into public.teachers (display_name_ar, gender, programs, tz)
      values (${name}, 'female', '{quran}', 'Asia/Riyadh') returning id`;
    if (!row) throw new Error('teacher not written');
    return row.id;
  });
}

async function dropTeacher(id: string): Promise<void> {
  await withSql(async (sql) => {
    await sql`delete from public.lessons where teacher_id = ${id}`;
    await sql`update public.students set teacher_id = null where teacher_id = ${id}`;
    await sql`delete from public.teachers where id = ${id}`;
  });
}

/**
 * The child is this teacher's (students.teacher_id), active (a trial family is never in a teacher's
 * chats: trial-no-teacher-chat.spec), and the guardian's phone, wa_id digits.
 */
async function assign(input: {
  studentId: string;
  guardianId: string;
  teacherId: string;
}): Promise<string> {
  return withSql(async (sql) => {
    await sql`update public.students set teacher_id = ${input.teacherId}, status = 'active' where id = ${input.studentId}`;
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${input.guardianId}`;
    if (!g) throw new Error('guardian missing');
    return g.phone_e164;
  });
}

test.describe('teacher mode (R-TCH-03, R-MSG-05)', () => {
  test('only my chats and my week; another teacher’s thread is refused; my reply is attributed', async ({
    asRole,
  }) => {
    test.setTimeout(150_000);
    await stubReset();
    const abrar = await resetAbrar();
    const tag = String(Date.now()).slice(-4);
    const other = await seedOtherTeacher(`نور ${tag}`);
    try {
      const mine = await seedFamily(`أم ريم ${tag}`, [`ريم ${tag}`]);
      const theirs = await seedFamily(`أم هالة ${tag}`, [`هالة ${tag}`]);
      const [rim, hala] = [mine.studentIds[0], theirs.studentIds[0]];
      if (!rim || !hala) throw new Error('students not written');
      const myPhone = await assign({
        studentId: rim,
        guardianId: mine.guardianId,
        teacherId: abrar,
      });
      const theirPhone = await assign({
        studentId: hala,
        guardianId: theirs.guardianId,
        teacherId: other,
      });
      const today = teacherToday();
      await seedLesson({ teacherId: abrar, studentId: rim, startsAt: riyadh(today, '10:00'), minutes: 30 });
      await seedLesson({ teacherId: other, studentId: hala, startsAt: riyadh(today, '11:00'), minutes: 30 });
      for (const [phone, name] of [[myPhone, `أم ريم ${tag}`], [theirPhone, `أم هالة ${tag}`]] as const) {
        const sent = await stubInboundAnswerable({ from: phone.slice(1), name, text: 'السلام عليكم' });
        expect(sent.status).toBe(200);
      }

      // The API scopes GET /threads to the families she teaches.
      const teacher = await asRole('teacher');
      await teacher.goto('/teacher/inbox');
      const mineRow = teacher.getByRole('link', { name: openThread(`أم ريم ${tag}`) });
      await expect(mineRow).toBeVisible({ timeout: 30_000 });
      await expect(teacher.getByRole('link', { name: openThread(`أم هالة ${tag}`) })).toHaveCount(0);

      // Another teacher's family by URL: the API answers 403 not_your_thread.
      await teacher.goto(`/teacher/inbox?phone=${encodeURIComponent(theirPhone)}`);
      // (react-query retries a failed read 3 times with backoff before it shows the error)
      await expect(teacher.getByText(ar.inbox.error.not_your_thread)).toBeVisible({
        timeout: 20_000,
      });

      // A reply from the academy number, in the 24 h window.
      await teacher.goto(`/teacher/inbox?phone=${encodeURIComponent(myPhone)}`);
      const log = teacher.getByRole('log', { name: ar.messages.log });
      await expect(log).toContainText('السلام عليكم');
      const reply = `أهلًا بحضرتك، الحلقة النهارده ${tag}`;
      await teacher.getByRole('textbox', { name: ar.inbox.composer.messageLabel }).fill(reply);
      await teacher.getByRole('button', { name: ar.inbox.composer.send, exact: true }).click();
      await expect(log).toContainText(reply);
      const sentBy = await withSql((sql) => sql<{ sent_by_teacher_id: string | null }[]>`
        select sent_by_teacher_id from public.messages where body = ${reply}`);
      expect(sentBy).toEqual([{ sent_by_teacher_id: abrar }]);

      await teacher.goto('/teacher/calendar');
      await expect(teacher.getByText(`ريم ${tag}`).first()).toBeVisible();
      await expect(teacher.getByText(`هالة ${tag}`)).toHaveCount(0);

      // The admin reads who sent it.
      const admin = await asRole('admin');
      await admin.goto(`/admin/inbox?phone=${encodeURIComponent(myPhone)}`);
      const adminLog = admin.getByRole('log', { name: ar.messages.log });
      await expect(adminLog).toContainText(reply);
      await expect(adminLog).toContainText(ar.inbox.sentBy.replace('{name}', 'أبرار'));
    } finally {
      await dropTeacher(other);
    }
  });
});
