import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/core/fixtures';
import { API, bearer } from '../../support/messages';
import { seedPackageStudent } from '../../support/finance/money';
import { resetAbrar, withSql } from '../../support/core/schedule';
import { dropHiba, HIBA_AMOUNT, HIBA_MONTH, seedAbrarPayout, seedHiba, type HibaSeed } from '../../support/people/teacher-isolation';

// Teacher isolation (R-NFR-02, R5 ownership, rule 9) through the API and the UI. teacher-mode.spec
// has the other teacher's chat in the UI (not_your_thread) and her calendar; teacher-rls.sql.spec
// the messages and draft-payout rows. Added here: «أبرار» against «هبة»'s chat on the API, lesson,
// report (read, draft, submit, attachments, PDF), history and payouts, the admin-only routes, and
// what her own lists answer. A 403 must be the guard's, so «هبة»'s rows are untouched afterwards.

const OWN_AMOUNT = 321;
/** Yesterday to next week (the API caps a window at 31 days). */
const WINDOW = `from=${new Date(Date.now() - 86_400_000).toISOString()}&to=${new Date(Date.now() + 7 * 86_400_000).toISOString()}`;
type Call = { method: 'GET' | 'POST' | 'PUT'; path: string; body?: unknown };

async function call(page: Page, req: Call): Promise<{ status: number; json: unknown }> {
  const res = await page.request.fetch(`${API}${req.path}`, {
    method: req.method,
    headers: await bearer(page),
    ...(req.body === undefined ? {} : { data: req.body }),
  });
  return { status: res.status(), json: await res.json().catch(() => null) };
}

/** Everything of «هبة»'s that a teacher request must answer 403 to. */
function refused(h: HibaSeed): Call[] {
  const phone = encodeURIComponent(h.phone);
  return [
    { method: 'GET', path: `/threads/${phone}` },
    { method: 'POST', path: `/threads/${phone}/text`, body: { text: 'مرحبا' } },
    { method: 'GET', path: `/lessons/${h.lessonId}/report-form` },
    { method: 'POST', path: `/lessons/${h.lessonId}/confirm` },
    { method: 'POST', path: `/lessons/${h.lessonId}/status`, body: { event: 'complete' } },
    { method: 'GET', path: `/reports/${h.reportId}` },
    { method: 'PUT', path: `/reports/${h.reportId}/draft`, body: { notes: 'تعديل' } },
    { method: 'POST', path: `/reports/${h.reportId}/submit`, body: { attendance: 'absent', expectedVersion: 1 } },
    { method: 'POST', path: `/reports/${h.reportId}/attachments/upload-url`, body: { mime: 'image/png', size: 100 } },
    { method: 'GET', path: `/reports/${h.reportId}/pdf` },
    { method: 'GET', path: `/students/${h.studentId}/reports` },
    // Admin-only routes: a teacher is refused whoever's data they name.
    { method: 'GET', path: `/students/${h.studentId}` },
    { method: 'GET', path: `/students/${h.studentId}/lessons` },
    { method: 'GET', path: `/lessons?${WINDOW}` },
    { method: 'GET', path: `/teachers/${h.teacherId}` },
    { method: 'GET', path: `/payouts?month=${HIBA_MONTH.slice(0, 7)}` },
    { method: 'POST', path: `/payouts/${h.payoutId}/approve` },
  ];
}

test.describe('teacher isolation (R-NFR-02, rule 9)', () => {
  test.skip(({ isMobile }) => isMobile, 'API-heavy scenario without layout: the desktop run covers it');

  test('«أبرار» reaches her own and none of «هبة»\'s: chat, lesson, report, history, payout', async ({ asRole }) => {
    test.setTimeout(150_000);
    const abrar = await resetAbrar();
    const tag = String(Date.now()).slice(-4);
    const mine = await seedPackageStudent({ teacherId: abrar, paid: true, guardian: 'أم هنا', student: `هنا ${tag}` });
    const hiba = await seedHiba(tag);
    try {
      await seedAbrarPayout({ teacherId: abrar, amount: OWN_AMOUNT });
      const teacher = await asRole('teacher');
      await teacher.goto('/teacher');

      for (const req of refused(hiba)) {
        const { status } = await call(teacher, req);
        expect(status, `${req.method} ${req.path}`).toBe(403);
      }
      expect((await call(teacher, { method: 'GET', path: `/threads/${encodeURIComponent(hiba.phone)}` })).json).toMatchObject({ code: 'not_your_thread' });
      const anon = await teacher.request.get(`${API}/reports/${hiba.reportId}`);
      expect(anon.status()).toBe(401);

      // Her own lesson and student still work, so the 403s are about ownership.
      expect((await call(teacher, { method: 'GET', path: `/lessons/${mine.todayLessonId}/report-form` })).status).toBe(200);
      expect((await call(teacher, { method: 'GET', path: `/students/${mine.studentId}/reports` })).status).toBe(200);

      // Her lists never carry «هبة»'s rows (scoped by the login: any id in the query is ignored).
      const lists = ['/teachers/me', `/teachers/me/lessons?${WINDOW}&teacherId=${hiba.teacherId}`,
        '/teachers/me/pending-reports', '/teachers/me/reports', '/threads'];
      for (const path of lists) {
        const { status, json } = await call(teacher, { method: 'GET', path });
        expect(status, path).toBe(200);
        const text = JSON.stringify(json);
        for (const secret of [hiba.studentId, hiba.lessonId, hiba.reportId, hiba.phone]) expect(text, path).not.toContain(secret);
      }
      // The same month holds both teachers' approved rows: she gets hers only.
      const payouts = await call(teacher, { method: 'GET', path: `/teachers/me/payouts?month=${HIBA_MONTH.slice(0, 7)}` });
      expect((payouts.json as { amount: number }[]).map((p) => p.amount)).toEqual([OWN_AMOUNT]);
      // The refused writes changed nothing.
      const kept = await withSql((sql) => sql<{ notes: string; version: number; status: string }[]>`
        select notes, version, status from public.lesson_reports where id = ${hiba.reportId}`);
      expect(kept).toEqual([{ notes: 'سر هبة', version: 1, status: 'submitted' }]);
    } finally {
      await dropHiba(hiba);
    }
  });

  test('the same in the UI: her week, her forms and her payouts show only hers', async ({ asRole }) => {
    test.setTimeout(150_000);
    const abrar = await resetAbrar();
    const tag = String(Date.now()).slice(-4);
    await seedPackageStudent({ teacherId: abrar, paid: true, guardian: 'أم سدرة', student: `سدرة ${tag}` });
    const hiba = await seedHiba(tag);
    try {
      await seedAbrarPayout({ teacherId: abrar, amount: OWN_AMOUNT });
      const teacher = await asRole('teacher');
      await teacher.goto('/teacher');
      await expect(teacher.getByRole('article', { name: new RegExp(`سدرة ${tag}`) })).toHaveCount(1);
      await expect(teacher.getByText(hiba.studentName)).toHaveCount(0);

      await teacher.goto(`/teacher/report/${hiba.lessonId}`);
      await expect(teacher.getByRole('alert').filter({ hasText: ar.common.forbidden })).toBeVisible();
      await expect(teacher.getByText('سر هبة')).toHaveCount(0);
      // (react-query retries a failed history read before it shows the error)
      await teacher.goto(`/teacher/reports/${hiba.studentId}`);
      await expect(teacher.getByRole('alert').filter({ hasText: ar.common.forbidden })).toBeVisible({ timeout: 30_000 });

      await teacher.goto('/teacher/payouts');
      await expect(teacher.getByText(String(OWN_AMOUNT)).first()).toBeVisible();
      await expect(teacher.getByText(String(HIBA_AMOUNT))).toHaveCount(0);
    } finally {
      await dropHiba(hiba);
    }
  });
});
