import { ar, expect, test } from '../../support/fixtures';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../../support/schedule';
import { AR_LOCALE } from '../../support/locale';

// Meetings (owner, 2026-10-04): «حلقة فورية» from «اجتماع جديد», «افتح الحلقة الآن» before the
// usual 15 minutes, and the student's own long-lived link /s/<token>. A meeting with students is always
// a lesson; the standalone «اجتماع داخلي» has its own spec (internal-meeting.spec.ts).

const tag = () => String(Date.now()).slice(-5);
const inAnHour = () => new Date(Math.ceil((Date.now() + 60 * 60_000) / 60_000) * 60_000);

test.describe('meetings', () => {
  test('«ابدأ الآن»: one instant lesson, room open, no package unit, no WhatsApp, then the classroom', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const name = `فورية${tag()}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const page = await asRole('admin');
    await page.goto('/admin/classrooms');
    await page.getByText(ar.meetings.new).click();
    await page.getByRole('button', { name: ar.meetings.startNow }).click();
    const dialog = page.getByRole('dialog', { name: ar.meetings.dialogTitle });
    await dialog.getByRole('textbox', { name: ar.common.search }).fill(name);
    await dialog.getByRole('textbox', { name: ar.common.search }).press('Enter');
    await dialog.getByRole('checkbox').first().check();
    await dialog.getByLabel(ar.meetings.teacher).selectOption(teacherId);
    await dialog.getByRole('button', { name: ar.meetings.start }).click();
    // Abrar has no availability left (resetAbrar), so the start is a clash: start anyway with a reason.
    await expect(dialog.getByText(ar.meetings.conflict)).toBeVisible();
    await dialog.getByLabel(ar.meetings.overrideReason).fill('حلقة طارئة');
    await dialog.getByRole('button', { name: ar.meetings.start }).click();
    await expect(page).toHaveURL(/\/classroom\/[0-9a-f-]{36}$/);

    const lessonId = page.url().split('/').at(-1) ?? '';
    const row = await withSql(async (sql) => {
      const [l] = await sql<{ instant: boolean; opened: boolean; chargeable: boolean; teacher_id: string }[]>`
        select l.instant, l.room_opened_at is not null as opened, ls.chargeable, l.teacher_id
        from public.lessons l join public.lesson_students ls on ls.lesson_id = l.id where l.id = ${lessonId}`;
      const [m] = await sql<{ n: number }[]>`select count(*)::int as n from public.messages where guardian_id = ${family.guardianId}`;
      return { ...l, messages: m?.n };
    });
    expect(row).toEqual({ instant: true, opened: true, chargeable: false, teacher_id: teacherId, messages: 0 });
    // An attendance outcome rewrites chargeable (no_show → true): migration 192 keeps an instant
    // lesson free, so it never uses a package unit nor earns a makeup.
    const after = await withSql(async (sql) => {
      await sql`update public.lesson_students set chargeable = true where lesson_id = ${lessonId}`;
      const [l] = await sql<{ chargeable: boolean }[]>`select chargeable from public.lesson_students where lesson_id = ${lessonId}`;
      return l?.chargeable;
    });
    expect(after).toBe(false);
  });

  test('«افتح الحلقة الآن»: the admin opens the room an hour early', async ({ asRole }) => {
    const teacherId = await resetAbrar();
    const name = `مبكرة${tag()}`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const startsAt = inAnHour();
    const lessonId = await seedLesson({ teacherId, studentId: family.studentIds[0] ?? '', startsAt, minutes: 30 });
    const page = await asRole('admin');
    await page.goto('/admin/classrooms');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' });
    if (today.format(startsAt) !== today.format(new Date())) await page.getByRole('button', { name: ar.schedule.nextDay }).click();
    const item = page.getByRole('listitem').filter({ hasText: name });
    await expect(item.getByRole('button', { name: ar.classroom.enter })).toBeDisabled();
    await item.getByRole('button', { name: ar.classroom.openNow }).click();
    await expect(item.getByRole('link', { name: ar.classroom.enter })).toHaveAttribute('href', `/classroom/${lessonId}`);
    const opened = await withSql(async (sql) => {
      const [l] = await sql<{ opened: boolean }[]>`select room_opened_at is not null as opened from public.lessons where id = ${lessonId}`;
      return l?.opened;
    });
    expect(opened).toBe(true);
  });

  test('«رابط دخول الطالب»: the student page shows the next lesson and opens with the room', async ({ asRole, browser }) => {
    const teacherId = await resetAbrar();
    const name = `رابط${tag()} محمد`;
    const family = await seedFamily(`أم ${name}`, [name]);
    const studentId = family.studentIds[0] ?? '';
    const lessonId = await seedLesson({ teacherId, studentId, startsAt: inAnHour(), minutes: 30 });
    const admin = await asRole('admin');
    await admin.goto(`/admin/students/${studentId}`);
    await admin.getByRole('button', { name: ar.studentLink.create }).click();
    const url = await admin.getByLabel(ar.studentLink.shown).inputValue();
    expect(url).toMatch(/\/s\/[A-Za-z0-9_-]{32}$/);

    const guest = await (await browser.newContext({ locale: AR_LOCALE })).newPage();
    await guest.goto(new URL(url).pathname);
    await expect(guest.getByText(ar.studentLink.page.greeting.replace('{name}', name.split(' ')[0] ?? ''))).toBeVisible();
    await expect(guest.getByRole('heading', { name: ar.studentLink.page.next })).toBeVisible();
    await expect(guest.getByRole('button', { name: ar.studentLink.page.enter })).toBeDisabled();

    await withSql((sql) => sql`update public.lessons set room_opened_at = now() where id = ${lessonId}`);
    await guest.reload();
    await expect(guest.getByRole('button', { name: ar.studentLink.page.enter })).toBeEnabled();
  });
});
