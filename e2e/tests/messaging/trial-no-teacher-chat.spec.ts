import { ar, expect, test } from '../../support/core/fixtures';
import { resetAbrar, seedFamily, withSql } from '../../support/core/schedule';
import { stubInbound, stubReset } from '../../support/core/wa-stub';

// Owner, 2026-10-11: «for the trial session, students and teachers cannot chat together; they will
// need the sales to manage between them, or the system». «أبرار» teaches a trial student and an
// active one: only the active family is in «المحادثات», the trial family's thread answers
// not_your_thread, and the trial student's file says the family is reached through sales.

const openThread = (name: string) => ar.inbox.openThread.replace('{name}', name);

/** This teacher's child with this status; returns the guardian's phone. */
async function assign(input: { studentId: string; guardianId: string; teacherId: string; status: 'trial' | 'active' }): Promise<string> {
  return withSql(async (sql) => {
    await sql`update public.students set teacher_id = ${input.teacherId}, status = ${input.status}::public.student_status
      where id = ${input.studentId}`;
    const [g] = await sql<{ phone_e164: string }[]>`select phone_e164 from public.guardians where id = ${input.guardianId}`;
    if (!g) throw new Error('guardian missing');
    return g.phone_e164;
  });
}

test.describe('trial students: no direct chat between the teacher and the family', () => {
  test('the trial family is not in my chats and is refused by URL; the active family stays', async ({ asRole }) => {
    test.setTimeout(120_000);
    await stubReset();
    const abrar = await resetAbrar();
    const tag = String(Date.now()).slice(-4);
    const trial = await seedFamily(`أم سلمى ${tag}`, [`سلمى ${tag}`]);
    const active = await seedFamily(`أم جنى ${tag}`, [`جنى ${tag}`]);
    const [salma, jana] = [trial.studentIds[0], active.studentIds[0]];
    if (!salma || !jana) throw new Error('students not written');
    const trialPhone = await assign({ studentId: salma, guardianId: trial.guardianId, teacherId: abrar, status: 'trial' });
    const activePhone = await assign({ studentId: jana, guardianId: active.guardianId, teacherId: abrar, status: 'active' });
    for (const [phone, name] of [[trialPhone, `أم سلمى ${tag}`], [activePhone, `أم جنى ${tag}`]] as const) {
      expect((await stubInbound({ from: phone.slice(1), name, text: 'السلام عليكم' })).status).toBe(200);
    }

    const teacher = await asRole('teacher');
    await teacher.goto('/teacher/inbox');
    await expect(teacher.getByRole('link', { name: openThread(`أم جنى ${tag}`) })).toBeVisible({ timeout: 30_000 });
    await expect(teacher.getByRole('link', { name: openThread(`أم سلمى ${tag}`) })).toHaveCount(0);

    // By URL: the API answers 403 not_your_thread (react-query retries before it shows the error).
    await teacher.goto(`/teacher/inbox?phone=${encodeURIComponent(trialPhone)}`);
    await expect(teacher.getByText(ar.inbox.error.not_your_thread)).toBeVisible({ timeout: 20_000 });

    // Her trial student's file: still hers, with the «through sales» note; the active one has none.
    await teacher.goto(`/teacher/reports/${salma}`);
    await expect(teacher.getByRole('note')).toHaveText(ar.teacherDash.trialChatViaSales);
    await teacher.goto(`/teacher/reports/${jana}`);
    await expect(teacher.getByText(`جنى ${tag}`).first()).toBeVisible();
    await expect(teacher.getByText(ar.teacherDash.trialChatViaSales)).toHaveCount(0);
  });
});
