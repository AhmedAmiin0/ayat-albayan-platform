import { expect, test, ar } from '../../support/fixtures';
import { googleApi, itemsOf, readyReport, resetGoogle, STUB_TEACHER_CAL, stubState } from '../../support/platform/google';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../../support/schedule';

// docs/24 §5: connect (stubbed OAuth) → map one teacher + one student → a platform lesson is a
// dry-run item → live writes both events to the stub → cancel deletes them → a report gives a PDF,
// an attendance row and a summary row. tools/google-stub only: nothing ever reaches Google.

const WAIT = { timeout: 45_000, intervals: [500, 1_000, 2_000] };
const g = ar.googleSync;
/** Back on «مزامنة Google» with the OAuth return's `?google=` read and cleared. */
const returnCleared = (url: URL) => url.pathname === '/admin/settings/google' && !url.searchParams.has('google');

test.describe('Google sync alongside the old script (docs/24)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'one shared stub: one run'));
  // Leave the sync OFF and disconnected: later specs must see no Google items or bell alerts.
  test.afterAll(() => resetGoogle());

  test('connect, map, dry run, live, cancel, report', async ({ asRole }) => {
    test.setTimeout(180_000);
    await resetGoogle();
    const teacherId = await resetAbrar();
    const family = await seedFamily('ولي أمر Google', ['طالب Google']);
    const studentId = family.studentIds[0] ?? '';
    const admin = await asRole('admin');

    // Connect: the stub consents at once and Google's redirect comes back to the settings page,
    // which forwards ?google=connected to «مزامنة Google» (/admin/settings/google).
    await admin.goto('/admin/settings/google');
    await expect(admin.getByRole('heading', { name: g.title })).toBeVisible();
    await expect(admin.getByRole('textbox', { name: g.connection.redirect })).toHaveValue('http://localhost:3100/integrations/google/callback');
    await admin.getByRole('button', { name: g.connection.connect }).click();
    // The return chain really ran: the page's note (oauthReturnNote) is up, and the query is cleared.
    await expect(admin.getByRole('status').filter({ hasText: g.connection.connected })).toBeVisible({ timeout: 20_000 });
    await expect(admin).toHaveURL(returnCleared);
    await expect(admin.getByText('academy@stub.test').first()).toBeVisible();

    // Discover (read-only), confirm the Drive root, map the teacher and the student («مجلد جديد»).
    await admin.getByRole('button', { name: g.drive.discover }).click();
    await admin.getByRole('button', { name: g.drive.confirm }).click();
    await expect(admin.getByText(g.common.confirmed).first()).toBeVisible();
    await googleApi(admin, { method: 'PUT', path: `/teachers/${teacherId}`, body: { calendar_id: STUB_TEACHER_CAL } });
    await googleApi(admin, { method: 'PUT', path: `/students/${studentId}`, body: { folder_id: null, attendance_sheet_id: null } });

    // Sync on in dry run: a platform lesson becomes a planned item and nothing reaches the stub.
    await googleApi(admin, { method: 'PUT', path: '/settings', body: { enabled: true } });
    const lessonId = await seedLesson({ teacherId, studentId, startsAt: new Date(Date.now() + 26 * 3_600_000), minutes: 45 });
    await expect.poll(async () => (await itemsOf(lessonId)).map((i) => `${i.kind}:${i.state}:${i.skip_reason}`), WAIT)
      .toEqual(['teacher_event:skipped:dry_run', 'main_event:skipped:dry_run']);
    expect((await itemsOf(lessonId))[0]?.planned).toMatchObject({ method: 'POST', target: `calendar:${STUB_TEACHER_CAL}` });
    expect(Object.values((await stubState()).calendars).flat()).toEqual([]);

    // Live (the confirmation names the calendars): both events on the stub, tagged, never jitsi.
    await admin.reload();
    await admin.getByRole('button', { name: g.switches.live }).click();
    const dialog = admin.getByRole('dialog', { name: g.confirm.liveTitle });
    await expect(dialog).toContainText('academy@stub.test');
    await expect(dialog).toContainText('E2E Teacher');
    await dialog.getByRole('button', { name: g.confirm.ok }).click();
    await expect.poll(async () => {
      const cals = (await stubState()).calendars;
      return [cals[STUB_TEACHER_CAL]?.length ?? 0, cals['primary']?.length ?? 0];
    }, WAIT).toEqual([1, 1]);
    const state = await stubState();
    const [teacherEv] = state.calendars[STUB_TEACHER_CAL] ?? [];
    const [mainEv] = state.calendars['primary'] ?? [];
    expect(teacherEv?.summary).toBe('حلقة — طالب Google · المنصة (يحتاج تأكيد)');
    expect(teacherEv?.extendedProperties?.private).toEqual({ ab_source: 'platform', ab_lesson_id: lessonId });
    expect(`${teacherEv?.description}${teacherEv?.location}`).not.toContain('jit.si');
    expect(teacherEv?.description).not.toContain('+966');
    expect(mainEv?.description).toContain('رقم الطالب: +966');

    // Cancel in the platform: both of OUR events are deleted.
    await withSql((sql) => sql`update public.lessons set status = 'cancelled_by_admin' where id = ${lessonId}`);
    await expect.poll(async () => Object.values((await stubState()).calendars).flat().length, WAIT).toBe(0);

    // A report: PDF in a new «طالب Google» folder, the 13-column row, the summary row.
    const lesson2 = await seedLesson({ teacherId, studentId, startsAt: new Date(Date.now() - 2 * 3_600_000), minutes: 45 });
    await readyReport({ lessonId: lesson2, studentId, teacherId });
    await expect.poll(async () => (await stubState()).files.filter((f) => f.name.endsWith('.pdf')).map((f) => f.name.startsWith('طالب Google — ')), WAIT).toEqual([true]);
    const after = await stubState();
    const sheet = after.files.find((f) => f.name === 'سجل حضور — طالب Google');
    await expect.poll(async () => ((await stubState()).sheets[sheet?.id ?? ''] ?? []).length, WAIT).toBe(2);
    const summary = after.files.find((f) => f.name === 'سجل الطلاب المشتركين');
    await expect.poll(async () => ((await stubState()).sheets[summary?.id ?? ''] ?? []).map((r) => r[0]), WAIT).toContain('طالب Google');

    // The log shows it.
    await admin.reload();
    await expect(admin.getByRole('list', { name: g.log.title })).toContainText(g.log.kind.report_pdf);
  });
});
