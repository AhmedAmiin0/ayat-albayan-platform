import { describe, expect, it } from 'vitest';
import { reportHistoryRoutes as routes } from '..';
import { REPORT_RUBRICS } from '../../rules';
import { REPORT_ID } from './report-view.fixture';

const LESSON_ID = '0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d';
const STUDENT = { id: LESSON_ID, code: 'AB-0201', name: 'طالب' };
const SENT = {
  attendance: 'on_time',
  grade_overall: 'good',
  status: 'submitted',
  pdf_status: 'ready',
  sent_at: '2026-11-20T18:10:00.000Z',
};
const SUMMARY = {
  id: REPORT_ID,
  lesson_id: LESSON_ID,
  starts_at: '2026-11-20T17:00:00.000Z',
  lesson_no: 4,
  teacher: { id: LESSON_ID, display_name_ar: 'معلم' },
  version: 1,
  ...SENT,
};
const POINT = {
  report_id: REPORT_ID,
  lesson_id: LESSON_ID,
  starts_at: SUMMARY.starts_at,
  overall: 3,
  rubrics: Object.fromEntries(REPORT_RUBRICS.map((r) => [r, null])),
};
const MINE = {
  id: REPORT_ID,
  lesson_id: LESSON_ID,
  starts_at: SUMMARY.starts_at,
  student: STUDENT,
  submitted_at: '2026-11-20T18:00:00.000Z',
  can_edit: false,
  edit_until: '2026-11-21T18:00:00.000Z',
  ...SENT,
};
const PENDING = {
  lesson_id: LESSON_ID,
  starts_at: SUMMARY.starts_at,
  status: 'completed',
  student: STUDENT,
  report_id: null,
};
const page = (items: unknown[]) => ({ items, total: items.length, page: 1, pageSize: 10 });

describe('reportHistoryRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(routes).map((r) => `${r.method} ${r.path}`)).toEqual([
      'GET /students/:id/reports',
      'GET /teachers/me/pending-reports',
      'GET /teachers/me/reports',
    ]);
  });

  it('reads a history on reports.read and my own lists on self.teacher, under reports', () => {
    expect(Object.values(routes).map((r) => r.permissions)).toEqual([
      ['reports.read'],
      ['self.teacher'],
      ['self.teacher'],
    ]);
    expect(Object.values(routes).every((r) => r.tags.join() === 'reports')).toBe(true);
  });

  it('takes a student uuid and a page, and my list filters with its page', () => {
    expect(routes.student.params.safeParse({ id: 's-1' }).success).toBe(false);
    expect(routes.student.query.parse({ page: '2', pageSize: '10' })).toEqual({
      page: 2,
      pageSize: 10,
    });
    expect(routes.mine.query.parse({ attendance: 'late', sort: 'grade' })).toEqual({
      attendance: 'late',
      sort: 'grade',
      page: 1,
      pageSize: 25,
    });
    expect(routes.mine.query.safeParse({ grade: 'great' }).success).toBe(false);
    expect(routes.mine.query.safeParse({ pageSize: '101' }).success).toBe(false);
  });

  it('answers a history page with its whole grade series', () => {
    const body = { ...page([SUMMARY]), series: [POINT] };
    expect(routes.student.response.parse(body)).toEqual(body);
    const old = { ...SUMMARY, submitted_at: null, can_edit: true, edit_until: null };
    expect(routes.student.response.parse({ ...body, items: [old] }).items).toEqual([old]);
    const short = { ...POINT, rubrics: { tajweed: 3 } };
    expect(routes.student.response.safeParse({ ...body, series: [short] }).success).toBe(false);
    const bad = { ...SUMMARY, status: 'sent' };
    expect(routes.student.response.safeParse({ ...body, items: [bad] }).success).toBe(false);
  });

  it('answers my missing reports and my sent reports page', () => {
    expect(routes.pending.response.parse([PENDING])).toEqual([PENDING]);
    const unknown = { ...PENDING, status: 'missed' };
    expect(routes.pending.response.safeParse([unknown]).success).toBe(false);
    expect(routes.mine.response.parse(page([MINE]))).toEqual(page([MINE]));
    const noEdit = { ...MINE, can_edit: undefined };
    expect(routes.mine.response.safeParse(page([noEdit])).success).toBe(false);
  });
});
