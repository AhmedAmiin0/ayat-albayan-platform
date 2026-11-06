import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { conflict } from '@/common/http/errors';
import {
  AFTER,
  lessonRow,
  REPORT_ID,
  reportRow,
  SIBLING_ID,
  submittedRow,
} from '@/modules/reporting/reports/reports.fakes';
import { reportsApp } from '@/modules/reporting/reports/test-app';

// Owner 2026-11-06: a report sent twice (a double tap, Enter, a retry) must never confirm the
// lesson twice, count the attendance twice, queue a second PDF or message the family twice;
// an edit is the same report (same id, expectedVersion) and only touches its own student.
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
const sibling = {
  student_id: SIBLING_ID,
  attendance: 'on_time' as const,
  chargeable: true,
  student: { id: SIBLING_ID, code: 'AB-0184', name: 'س', tz: 'Asia/Riyadh', program: 'quran' } as const,
};

describe('POST /reports/:id/v2/submit — sent twice, edited', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const submit = (body: object) => h.call({ method: 'POST', url: URL, body });
  const expectOneOfEach = (writes = 1) => {
    expect(h.reports.submit).toHaveBeenCalledTimes(writes);
    expect(h.events.changed).toHaveBeenCalledTimes(1);
    expect(h.pdf.enqueue).toHaveBeenCalledTimes(1);
    expect(h.push.notifyAdmins).toHaveBeenCalledTimes(1);
  };

  it('the same version sent again → 409 version_conflict; one confirmation, one PDF', async () => {
    h.reports.get.mockResolvedValueOnce(reportRow(v2)).mockResolvedValue(submittedRow(v2));
    expect((await submit(FORM)).statusCode).toBe(200);
    const again = await submit(FORM);
    expect(again.statusCode).toBe(409);
    expect(again.json().code).toBe('version_conflict');
    expectOneOfEach();
  });

  it('two sends racing past the check: the compare-and-set refuses the second', async () => {
    h.reports.get.mockResolvedValue(reportRow(v2));
    h.reports.submit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(conflict('version_conflict'));
    const [first, second] = await Promise.all([submit(FORM), submit(FORM)]);
    expect([first.statusCode, second.statusCode].sort()).toEqual([200, 409]);
    // Both reach submit_report; its expected_version compare-and-set lets one write through.
    expectOneOfEach(2);
  });

  it('an edit of a held group lesson: no lesson change, the other student untouched', async () => {
    const mine = lessonRow().lesson_students.map((s) => ({ ...s, attendance: 'on_time' as const }));
    const lesson = lessonRow({ status: 'completed', lesson_students: [...mine, sibling] });
    h.reports.get.mockResolvedValue(submittedRow(v2));
    h.reports.lesson.mockResolvedValue(lesson);
    const res = await submit({ ...FORM, attendance: 'late', expectedVersion: 1 });
    expect(res.statusCode).toBe(200);
    const payload = h.reports.submit.mock.calls[0]?.[0];
    // submit_report applies `student` to this report's own lesson_students row only.
    expect(payload).toMatchObject({
      report_id: REPORT_ID,
      expected_version: 1,
      report: { version: 2 },
    });
    expect(payload?.lesson_change).toBeUndefined();
    expect(payload?.student).toEqual({ attendance: 'late', chargeable: true });
  });

  it('an edit with a stale version → 409 version_conflict, nothing written', async () => {
    h.reports.get.mockResolvedValue(submittedRow({ ...v2, version: 2 }));
    const res = await submit({ ...FORM, expectedVersion: 1 });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('version_conflict');
    expect(h.reports.submit).not.toHaveBeenCalled();
    expect(h.pdf.enqueue).not.toHaveBeenCalled();
    expect(h.push.notifyAdmins).not.toHaveBeenCalled();
  });
});
