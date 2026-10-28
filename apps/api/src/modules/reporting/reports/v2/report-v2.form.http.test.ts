import { SETTING_DEFAULTS } from '@ab/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AFTER, LESSON_ID, lessonRow, REPORT_ID, reportRow, STUDENT_ID, TEACHER } from '../reports.fakes';
import { reportsApp } from '../test-app';

const FORM_URL = `/lessons/${LESSON_ID}/report-form`;
const DRAFT_URL = `/reports/${REPORT_ID}/v2/draft`;
const MEMORY = { last: { recited: null, new: { surah: 67, from: 1, to: 15 }, revision: null }, recent_surahs: [67] };

describe('report_form_v2 — the flag, the form and the v2 autosave', () => {
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
  const flag = (on: boolean) => vi.mocked(h.settings.all).mockResolvedValue({ ...SETTING_DEFAULTS, report_form_v2: on });

  it('flag off (default): v1 drafts, no memorization read, the entry exactly as before', async () => {
    const res = await h.call({ method: 'GET', url: FORM_URL });
    expect(h.reports.ensureDrafts).toHaveBeenCalledWith(lessonRow(), { actorId: TEACHER.id, formVersion: 1 });
    expect(h.reports.alignUntouched).toHaveBeenCalledWith(LESSON_ID, 1);
    expect(h.lessons.memory).not.toHaveBeenCalled();
    const [entry] = res.json().entries;
    expect(entry).not.toHaveProperty('memory');
    expect(entry.report).toMatchObject({ form_version: 1, content: null });
  });

  it('flag on: new drafts are v2 and carry the history read from v2 reports (this form’s reports excluded)', async () => {
    flag(true);
    h.reports.byLesson.mockResolvedValue([reportRow({ form_version: 2 })]);
    h.lessons.memory.mockResolvedValue(new Map([[STUDENT_ID, MEMORY]]));
    const res = await h.call({ method: 'GET', url: FORM_URL });
    expect(h.reports.ensureDrafts).toHaveBeenCalledWith(lessonRow(), { actorId: TEACHER.id, formVersion: 2 });
    expect(h.reports.alignUntouched).toHaveBeenCalledWith(LESSON_ID, 2);
    expect(h.lessons.memory).toHaveBeenCalledWith([STUDENT_ID], [REPORT_ID]);
    expect(res.json().entries[0]).toMatchObject({ memory: MEMORY, report: { form_version: 2 } });
  });

  it('flag on, an old (v1) report keeps its own form: no history, rendered as v1', async () => {
    flag(true);
    const res = await h.call({ method: 'GET', url: FORM_URL });
    expect(h.lessons.memory).not.toHaveBeenCalled();
    expect(res.json().entries[0].report.form_version).toBe(1);
  });

  it('v2 autosave writes only the fields sent (content as sent, with its defaults)', async () => {
    h.reports.get.mockResolvedValue(reportRow({ form_version: 2 }));
    h.reports.updateDraft.mockResolvedValue(reportRow({ form_version: 2, content: { segments: [] } }));
    const content = { segments: [{ kind: 'new', surah: 67, from: 16, to: 22, grade: null }] };
    const res = await h.call({ method: 'PUT', url: DRAFT_URL, body: { content, homework: 'x' } });
    expect(res.statusCode).toBe(200);
    expect(h.reports.updateDraft).toHaveBeenCalledWith(REPORT_ID, {
      homework: 'x',
      content: { segments: content.segments, tajweed: null, arabic: null, islamic: null, quick: [] },
    });
    expect(res.json().content).toEqual({ segments: [], tajweed: null, arabic: null, islamic: null, quick: [] });
  });

  it('v2 autosave: 409 on a v1 report or a submitted one; v1 autosave 409 on a v2 report', async () => {
    h.reports.get.mockResolvedValue(reportRow());
    expect((await h.call({ method: 'PUT', url: DRAFT_URL, body: { notes: 'x' } })).json().code).toBe('form_version_mismatch');
    h.reports.get.mockResolvedValue(reportRow({ form_version: 2, status: 'submitted', version: 1, submitted_at: AFTER.toISOString() }));
    expect((await h.call({ method: 'PUT', url: DRAFT_URL, body: { notes: 'x' } })).json().code).toBe('already_submitted');
    h.reports.get.mockResolvedValue(reportRow({ form_version: 2 }));
    expect((await h.call({ method: 'PUT', url: `/reports/${REPORT_ID}/draft`, body: { notes: 'x' } })).json().code).toBe('form_version_mismatch');
    expect(h.reports.updateDraft).not.toHaveBeenCalled();
  });

  it('another teacher cannot autosave (403); the admin reads a v2 report with its content', async () => {
    h.reports.get.mockResolvedValue(reportRow({ form_version: 2, content: { segments: [{ kind: 'new', surah: 1, from: 1, to: 7, grade: 'good' }] } }));
    expect((await h.call({ method: 'PUT', url: DRAFT_URL, token: 'other', body: { notes: 'x' } })).statusCode).toBe(403);
    const view = await h.call({ method: 'GET', url: `/reports/${REPORT_ID}`, token: 'admin' });
    expect(view.json().content.segments).toEqual([{ kind: 'new', surah: 1, from: 1, to: 7, grade: 'good' }]);
  });
});
