import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, LESSON_ID, REPORT_ID, reportRow, submittedRow, TEACHER } from '../reports.fakes';
import { reportsApp } from '../test-app';

const URL = `/reports/${REPORT_ID}/v2/submit`;
const seg = (kind: string, [surah, from, to]: [number, number, number]) => ({ kind, surah, from, to, grade: 'very_good' });
const QURAN = { segments: [seg('recited', [67, 1, 15]), seg('new', [67, 16, 22]), seg('revision', [68, 1, 20])], tajweed: 'madd' };
const FORM = { attendance: 'on_time', program: 'quran', overall: 'very_good', homework: 'مراجعة', nextPlan: 'الملك 23–30', expectedVersion: 0 };
const v2Draft = () => reportRow({ form_version: 2 });

describe('POST /reports/:id/v2/submit (the new form)', () => {
  let h: Awaited<ReturnType<typeof reportsApp>>;
  beforeAll(async () => {
    h = await reportsApp();
  });
  afterAll(() => h.app.close());
  beforeEach(() => {
    h.reset();
    h.reports.get.mockResolvedValueOnce(v2Draft()).mockResolvedValue(submittedRow({ form_version: 2 }));
    vi.useFakeTimers({ now: AFTER, toFake: ['Date'] });
  });
  afterEach(() => vi.useRealTimers());

  const submit = (body: object) => h.call({ method: 'POST', url: URL, body });
  const payload = () => h.reports.submit.mock.calls[0]?.[0];

  it('Quran, attended: content + v1 grade columns in one RPC, lesson completed, PDF queued as v1', async () => {
    const res = await submit({ ...FORM, content: QURAN });
    expect(res.statusCode).toBe(200);
    expect(payload()).toMatchObject({
      report_id: REPORT_ID,
      actor: TEACHER.id,
      report: { attendance: 'on_time', program: 'quran', grade_overall: 'very_good', grade_recitation: 'very_good', grade_memorization: 'very_good', grade_revision: 'very_good', grade_tajweed: null, homework: 'مراجعة', next_plan: 'الملك 23–30', version: 1 },
      content: { segments: QURAN.segments, tajweed: 'madd', arabic: null, islamic: null, quick: [] },
      lesson_change: { changes: [{ id: LESSON_ID, to_status: 'completed' }] },
    });
    // The Google sheet's text columns (التسميع / الحفظ الجديد / المراجعة) read the parts.
    expect(payload()?.report).toMatchObject({ recited: 'الملك 1–15', new_memorization: 'الملك 16–22', revision: 'القلم 1–20', theory: 'المدود' });
    expect(h.pdf.enqueue).toHaveBeenCalledWith(REPORT_ID);
    expect(res.json()).toMatchObject({ form_version: 2, status: 'submitted' });
  });

  it('absent: no content, grades, homework or plan stored (the form hides them); the note stays', async () => {
    const res = await submit({ ...FORM, attendance: 'absent', notes: 'نرجو الإبلاغ', content: QURAN });
    expect(res.statusCode).toBe(200);
    expect(payload()).toMatchObject({
      report: { attendance: 'absent', grade_overall: null, grade_memorization: null, homework: null, next_plan: null, notes: 'نرجو الإبلاغ' },
      content: { segments: [], tajweed: null, quick: [] },
      lesson_change: { changes: [{ to_status: 'no_show' }] },
    });
  });

  it('Arabic and Islamic studies: only the taught program’s part is kept', async () => {
    const skills = { reading: 'good', writing: 'good', listening: 'excellent', grammar: 'good' };
    const arabic = { topic: 'الجملة الاسمية', skills };
    await submit({ ...FORM, program: 'arabic', content: { ...QURAN, arabic } });
    expect(payload()?.content).toMatchObject({ segments: [], arabic, islamic: null });
    h.reports.get.mockResolvedValueOnce(v2Draft());
    const islamic = { domain: 'fiqh', topic: 'أركان الوضوء', memorized: null, rates: { comprehension: 'good', participation: 'good' } };
    await submit({ ...FORM, attendance: 'late', program: 'islamic_studies', content: { islamic } });
    expect(h.reports.submit.mock.calls[1]?.[0]?.content).toMatchObject({ segments: [], islamic });
  });

  it.each([
    [{ ...FORM, content: {} }, 'missing_segments'],
    [{ ...FORM, content: { segments: [{ ...seg('new', [67, 16, 22]), grade: null }] } }, 'missing_grades'],
    [{ ...FORM, program: 'arabic', content: { arabic: { topic: '' } } }, 'missing_topic'],
    [{ ...FORM, program: 'islamic_studies', content: { islamic: { topic: 'x' } } }, 'missing_domain'],
    [{ ...FORM, content: { segments: [seg('new', [67, 16, 31])] } }, 'invalid_range'],
  ])('400 when the program’s content is incomplete (%#: %s)', async (body, code) => {
    const res = await submit(body);
    expect(res.statusCode).toBe(400);
    expect(JSON.stringify(res.json())).toContain(code);
    expect(h.reports.submit).not.toHaveBeenCalled();
  });

  it('409 form_version_mismatch: v2 routes never write a v1 report, v1 routes never a v2 one', async () => {
    h.reports.get.mockReset();
    h.reports.get.mockResolvedValue(reportRow());
    expect((await submit({ ...FORM, content: QURAN })).json()).toMatchObject({ code: 'form_version_mismatch' });
    h.reports.get.mockResolvedValue(v2Draft());
    const v1 = await h.call({ method: 'POST', url: `/reports/${REPORT_ID}/submit`, body: { attendance: 'absent', expectedVersion: 0 } });
    expect([v1.statusCode, v1.json().code]).toEqual([409, 'form_version_mismatch']);
    expect(h.reports.submit).not.toHaveBeenCalled();
  });

  it('only the lesson’s teacher or an admin writes: another teacher 403, a guardian 403', async () => {
    expect((await h.call({ method: 'POST', url: URL, token: 'other', body: { ...FORM, content: QURAN } })).statusCode).toBe(403);
    expect((await h.call({ method: 'POST', url: URL, token: 'guardian', body: { ...FORM, content: QURAN } })).statusCode).toBe(403);
    expect(h.reports.submit).not.toHaveBeenCalled();
  });
});
