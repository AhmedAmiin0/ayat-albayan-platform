import { ar, expect, test } from '../support/fixtures';
import { API, bearer, setSetting } from '../support/messages';
import { seedPackageStudent } from '../support/finance/money';
import { resetAbrar, withSql } from '../support/schedule';
import { apiSubmit, reportRow } from '../support/teacher-extra';
import { approveTemplates, documentOf, sentToDigits } from '../support/teacher-templates';
import { setMessaging, stubReset } from '../support/wa-stub';

// What the guardian actually receives (R-REP-03, R-SUB-02, R-MSG-01): journeys 2 and 3 stop at
// `queued`. Here the send gate is open, the two templates are approved at «Meta» (the stub), and
// the 30 s sender delivers: the report PDF as the template's document under the report's file
// name (sent_at stamped, the signed link serves the PDF) and renewal_due at two lessons left.

const WAIT = { timeout: 240_000, intervals: [2_000, 5_000] };
const KEYS = ['report_ready', 'renewal_due'];

async function guardianOf(guardianId: string): Promise<{ digits: string; tz: string }> {
  const [g] = await withSql((sql) => sql<{ phone: string; tz: string }[]>`select phone_e164 as phone, tz from public.guardians where id = ${guardianId}`);
  return { digits: (g?.phone ?? '').replace(/\D/g, ''), tz: g?.tz ?? 'Asia/Riyadh' };
}

test.describe('guardian deliveries over WhatsApp (R-REP-03, R-SUB-02)', () => {
  test.skip(({ isMobile }) => isMobile, 'delivery is server-side with no layout: the desktop run covers it');
  let restore: (() => Promise<void>) | null = null;
  test.beforeEach(async () => {
    await stubReset();
    await setMessaging(true);
    await setSetting('auto_messages_enabled', true);
  });
  test.afterEach(async () => {
    await setMessaging(false); // journeys 2–4 assert `queued`
    await restore?.();
    restore = null;
  });

  test('the submitted report reaches the guardian as a PDF document with the file name', async ({ asRole }) => {
    test.setTimeout(420_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم ملك', student: 'ملك' });
    const { digits, tz } = await guardianOf(seed.guardianId);
    restore = await approveTemplates(await asRole('admin'), KEYS);
    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await apiSubmit(teacher, { lessonId: seed.todayLessonId });

    // The PDF job renders it, queues report_ready, and the sender hands it to «Meta».
    await expect.poll(async () => (await sentToDigits(digits)).filter((m) => m.template === 'report_ready').length, WAIT).toBe(1);
    const [sent] = (await sentToDigits(digits)).filter((m) => m.template === 'report_ready');
    expect(JSON.stringify(sent?.body)).toContain('ملك');
    const [info] = await withSql((sql) => sql<{ code: string; starts_at: Date }[]>`
      select s.code, l.starts_at from public.students s, public.lessons l where s.id = ${seed.studentId} and l.id = ${seed.todayLessonId}`);
    const date = (info?.starts_at ?? new Date()).toLocaleDateString('en-CA', { timeZone: tz });
    const doc = documentOf(sent);
    expect(doc?.filename).toBe(`${info?.code ?? ''}_${date}_${ar.reports.pdfFileSuffix}.pdf`);
    await expect.poll(async () => (await reportRow(seed.todayLessonId)).sent_at, WAIT).not.toBeNull();

    // The link in the message is a signed URL that serves the PDF.
    const file = await fetch(doc?.link ?? '');
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toContain('application/pdf');
    expect(Buffer.from(await file.arrayBuffer()).subarray(0, 4).toString()).toBe('%PDF');
    const rows = await withSql((sql) => sql<{ status: string; wa: string | null }[]>`
      select status, wa_message_id as wa from public.messages where guardian_id = ${seed.guardianId} and template_key = 'report_ready'`);
    expect(rows).toEqual([{ status: 'sent', wa: sent?.id ?? null }]);
  });

  test('renewal_due is delivered once the package is down to 2 lessons', async ({ asRole }) => {
    test.setTimeout(240_000);
    const teacherId = await resetAbrar();
    const seed = await seedPackageStudent({ teacherId, paid: true, guardian: 'أم رند', student: 'رند' });
    const { digits } = await guardianOf(seed.guardianId);
    const admin = await asRole('admin');
    restore = await approveTemplates(admin, KEYS);
    await admin.goto('/admin');

    // Today's started lesson is completed → 3 → 2 left → renewal_due (journey 3 queues it).
    const res = await admin.request.post(`${API}/lessons/${seed.todayLessonId}/status`, { headers: await bearer(admin), data: { event: 'complete' } });
    expect(res.status()).toBe(200);
    await expect.poll(async () => (await sentToDigits(digits)).filter((m) => m.template === 'renewal_due').length, WAIT).toBe(1);
    const [sent] = (await sentToDigits(digits)).filter((m) => m.template === 'renewal_due');
    const text = JSON.stringify(sent?.body);
    expect(text).toContain('رند');
    expect(text).toContain(ar.subscriptions.progress.left.two);
    const rows = await withSql((sql) => sql<{ status: string }[]>`
      select status from public.messages where guardian_id = ${seed.guardianId} and template_key = 'renewal_due'`);
    expect(rows).toEqual([{ status: 'sent' }]);
  });
});
