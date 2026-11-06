import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, LESSON_ID, lessonRow, REPORT_ID, reportRow, submittedRow } from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';

// Owner 2026-11-06: «after the teacher writes the report the lesson gets marked as confirmed».
// The submit is the lesson's outcome (the shared state machine, submit_report's compare-and-set);
// an edit never confirms twice; each submitted version queues its PDF once.
const URL = `/reports/${REPORT_ID}/v2/submit`;
const seg = { kind: 'recited', surah: 67, from: 1, to: 15, grade: 'very_good' };
const FORM = {
  attendance: 'on_time',
  program: 'quran',
  overall: 'very_good',
  expectedVersion: 0,
  content: { segments: [seg] },
};
const v2 = { form_version: 2 as const };

describe('POST /reports/:id/v2/submit — confirms the lesson', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.reports.get.mockResolvedValueOnce(reportRow(v2)).mockResolvedValue(submittedRow(v2));
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const submit = (body: object) => h.call({ method: 'POST', url: URL, body });
  const payload = () => h.reports.submit.mock.calls[0]?.[0];

  it.each(['scheduled', 'confirmed'] as const)(
    '«%s» (needs confirmation or confirmed) → held',
    async (status) => {
      h.reports.lesson.mockResolvedValue(lessonRow({ status }));
      expect((await submit(FORM)).statusCode).toBe(200);
      expect(payload()?.lesson_change?.changes).toEqual([
        expect.objectContaining({ id: LESSON_ID, from_status: status, to_status: 'completed' }),
      ]);
      expect(h.pdf.enqueue).toHaveBeenCalledTimes(1);
    },
  );

  it('«absent» in the report records the absence, not a held lesson', async () => {
    expect((await submit({ ...FORM, attendance: 'absent' })).statusCode).toBe(200);
    expect(payload()?.lesson_change?.changes).toEqual([
      expect.objectContaining({ to_status: 'no_show' }),
    ]);
  });

  it('an edit within the window: the lesson already held, nothing re-confirmed; a new PDF version', async () => {
    const marked = lessonRow().lesson_students.map((s) => ({
      ...s,
      attendance: 'on_time' as const,
    }));
    h.reports.get.mockReset().mockResolvedValue(submittedRow(v2));
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'completed', lesson_students: marked }));
    expect((await submit({ ...FORM, expectedVersion: 1 })).statusCode).toBe(200);
    expect(payload()).toMatchObject({ expected_version: 1, report: { version: 2 } });
    expect(payload()?.lesson_change).toBeUndefined();
    expect(payload()?.student).toBeUndefined();
    expect(h.pdf.enqueue).toHaveBeenCalledTimes(1);
  });

  it("an edit to «absent» after the lesson was held: only this student's attendance changes", async () => {
    const marked = lessonRow().lesson_students.map((s) => ({
      ...s,
      attendance: 'on_time' as const,
    }));
    h.reports.get.mockReset().mockResolvedValue(submittedRow(v2));
    h.reports.lesson.mockResolvedValue(lessonRow({ status: 'completed', lesson_students: marked }));
    expect((await submit({ ...FORM, attendance: 'absent', expectedVersion: 1 })).statusCode).toBe(
      200,
    );
    expect(payload()?.lesson_change).toBeUndefined();
    expect(payload()?.student).toMatchObject({ attendance: 'absent' });
  });

  it('a refused submit (stale version) confirms nothing and queues no PDF', async () => {
    expect((await submit({ ...FORM, expectedVersion: 3 })).statusCode).toBe(409);
    expect(h.reports.submit).not.toHaveBeenCalled();
    expect(h.pdf.enqueue).not.toHaveBeenCalled();
  });
});
