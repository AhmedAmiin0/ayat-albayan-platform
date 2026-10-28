import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { ReportLessonQueries } from '../report-lesson.queries';
import { ReportsQueries } from '../reports.queries';
import { lessonRow, LESSON_ID, STUDENT_ID } from '../reports.fakes';
import { callSubmitReport } from '../submit/report-rpc';

const content = (surah: number, to: number) => ({ segments: [{ kind: 'new', surah, from: 1, to, grade: 'good' }] });

describe('v2 queries', () => {
  it('ensureDrafts stamps the form version on the new drafts', async () => {
    const { db, argsOf } = fakeDb({ lesson_reports: [{}] });
    await new ReportsQueries(db).ensureDrafts(lessonRow(), { actorId: 'a', formVersion: 2 });
    expect(argsOf('lesson_reports', 'upsert')?.[0]).toMatchObject([{ student_id: STUDENT_ID, form_version: 2 }]);
  });

  it('alignUntouched moves only never-sent drafts with nothing filled in', async () => {
    const { db, calls } = fakeDb({ lesson_reports: [{}] });
    await new ReportsQueries(db).alignUntouched(LESSON_ID, 2);
    const on = (m: string) => calls.filter((c) => c.method === m).map((c) => c.args);
    expect(on('update')).toEqual([[{ form_version: 2 }]]);
    expect(on('eq')).toEqual([['lesson_id', LESSON_ID], ['status', 'draft'], ['version', 0]]);
    expect(on('neq')).toEqual([['form_version', 2]]);
    expect(on('is').map(([col]) => col)).toEqual(expect.arrayContaining(['content', 'notes', 'grade_overall', 'recited']));
  });

  it('memory reads submitted v2 reports only, newest first, skipping this form’s reports and unreadable content', async () => {
    const rows = [
      { id: 'this', student_id: STUDENT_ID, form_version: 2, content: content(67, 30) },
      { id: 'r2', student_id: STUDENT_ID, form_version: 2, content: content(67, 15) },
      { id: 'bad', student_id: STUDENT_ID, form_version: 2, content: { segments: 'x' } },
    ];
    const { db, calls } = fakeDb({ lesson_reports: [{ data: rows }] });
    const out = await new ReportLessonQueries(db).memory([STUDENT_ID], ['this']);
    expect(calls.filter((c) => c.method === 'eq').map((c) => c.args)).toEqual([['student_id', STUDENT_ID], ['form_version', 2], ['status', 'submitted']]);
    expect(out.get(STUDENT_ID)?.last.new).toEqual({ surah: 67, from: 1, to: 15 });
    expect(await new ReportLessonQueries(fakeDb({}).db).memory([], [])).toEqual(new Map());
  });

  it('a payload with content goes to submit_report_content; without it, to submit_report as before', async () => {
    const { db, calls } = fakeDb({});
    const base = { report_id: 'r', expected_version: 0, actor: 'a', report: { version: 1, submitted_at: 'x', edited_at: null } };
    await callSubmitReport(db, base);
    await callSubmitReport(db, { ...base, content: { segments: [] } });
    expect(calls.map((c) => c.table)).toEqual(['rpc:submit_report', 'rpc:submit_report_content']);
  });
});
