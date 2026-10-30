import { ar, expect, test } from '../../support/core/fixtures';
import { uploadInvoice } from '../../support/finance/invoice';
import { lessonsOf, resetAbrar, ruleOf, seedFamily, setAvailability, withSql } from '../../support/core/schedule';

// Two siblings in ONE group lesson on a two-day series (R-STU-04, R-SCH-02/06): the wizard ticks the
// sibling, a second pick on the grid adds Wednesday at the same time, SeriesCheck is clean, and the booking writes one rule with both
// students, both on every lesson, and a single confirmation to the guardian naming both.

const weekday = ar.enums.weekday;

test.describe('siblings group + multi-day series (R-STU-04)', () => {
  test('Sunday + Wednesday for two siblings: one rule, two students per lesson, one confirmation', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    await setAvailability(teacherId, [[0, '16:00', '18:00'], [3, '16:00', '18:00']]);
    const stamp = String(Date.now()).slice(-4);
    const [a, b] = [`سلمى${stamp}`, `جود${stamp}`];
    const family = await seedFamily(`أم ${a}`, [a, b]);
    const [idA = '', idB = ''] = family.studentIds;

    const admin = await asRole('admin');
    await admin.goto(`/admin/book?studentId=${idA}`);
    await admin.getByRole('checkbox', { name: new RegExp(b) }).check();
    const next = () => admin.getByRole('button', { name: ar.booking.next }).click();
    await next();
    await admin.getByRole('radio', { name: /أبرار/ }).check();
    await next();
    await next(); // package 8, 45 min
    const step = admin.getByRole('region', { name: ar.booking.steps.slot });
    await step.getByRole('button', { name: ar.schedule.nextWeek }).click();
    await step.getByRole('region', { name: new RegExp(`^${weekday['0']} `) }).getByRole('button', { name: /16:00/ }).click();
    await step.getByRole('region', { name: new RegExp(`^${weekday['3']} `) }).getByRole('button', { name: /16:00/ }).click();
    const days = step.getByRole('region', { name: new RegExp(ar.booking.pickDays) });
    for (const d of ['0', '3'] as const) {
      await expect(days.getByRole('button', { name: ar.booking.removeDay.replace('{day}', weekday[d]) })).toBeVisible();
    }
    await expect(step.getByText(ar.booking.seriesFree)).toBeVisible(); // 0 conflicts over the whole series
    await next();
    await uploadInvoice(admin);
    await admin.getByRole('button', { name: ar.booking.submit }).click();
    await expect(admin.getByRole('heading', { name: ar.booking.booked })).toBeVisible();

    // One rule, both students on it, both on every lesson, on both weekdays (16:00 Riyadh = 13:00Z).
    expect(await ruleOf(idA)).toHaveLength(1);
    const [rule] = await withSql((sql) => sql<{ id: string; byday: number[]; students: number }[]>`
      select r.id, r.byday, (select count(*)::int from public.schedule_rule_students x where x.rule_id = r.id) as students
      from public.schedule_rules r join public.schedule_rule_students rs on rs.rule_id = r.id where rs.student_id = ${idA}`);
    expect(rule).toMatchObject({ byday: [0, 3], students: 2 });
    const perLesson = await withSql((sql) => sql<{ n: number }[]>`
      select count(ls.student_id)::int as n from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id
      where l.rule_id = ${rule?.id ?? ''} group by l.id`);
    expect(perLesson.length).toBeGreaterThanOrEqual(4);
    expect(new Set(perLesson.map((r) => r.n))).toEqual(new Set([2]));
    const lessons = await lessonsOf(idB);
    expect(new Set(lessons.map((l) => l.starts_at.getUTCDay()))).toEqual(new Set([0, 3]));
    expect((await lessonsOf(idA)).length).toBe(lessons.length);

    // One confirmation for the guardian; {{1}} joins both names (Intl.ListFormat, the API's own join).
    const names = new Intl.ListFormat('ar', { type: 'conjunction' });
    const sent = await withSql((sql) => sql<{ template_key: string; template_params: Record<string, string> }[]>`
      select template_key, template_params from public.messages where guardian_id = ${family.guardianId} and direction = 'outbound'`);
    expect(sent).toHaveLength(1);
    expect([names.format([a, b]), names.format([b, a])]).toContain(sent[0]?.template_params['1']);
  });
});
