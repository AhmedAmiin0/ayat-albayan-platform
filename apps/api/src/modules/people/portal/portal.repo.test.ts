import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { PortalLessonsRepo } from './lessons/portal-lessons.repo';
import { PortalPackageRepo } from './package/portal-package.repo';
import { PortalSettings } from './portal.settings';
import { PortalReportsRepo } from './reports/portal-reports.repo';
import { PortalScopeRepo } from './scope/portal-scope.repo';

const SECRET = /price|amount|currency|fx|note|reason|phone|email|attendance|\*/;

describe('portal queries (service role, whitelisted selects)', () => {
  it('scope: one rpc by the caller profile', async () => {
    const f = fakeDb({ 'rpc:portal_students_of': [{ data: [{ id: 's1', code: 'AB-0201', name: 'سلمى', tz: 'Asia/Riyadh', contact_is_self: true }] }] });
    expect(await new PortalScopeRepo(f.db).studentsOf('p1')).toEqual([{ id: 's1', code: 'AB-0201', name: 'سلمى', tz: 'Asia/Riyadh', contact_is_self: true }]);
    expect(f.argsOf('rpc:portal_students_of', 'rpc')).toEqual([{ p_profile: 'p1' }]);
  });

  it('lessons: this student only, the window bounds, never a moved-away lesson, sorted by start', async () => {
    const rows = [{ lesson: { id: 'b', starts_at: '2026-10-28T10:00:00Z' } }, { lesson: { id: 'a', starts_at: '2026-10-27T10:00:00Z' } }, { lesson: null }];
    const f = fakeDb({ lesson_students: [{ data: rows }] });
    const out = await new PortalLessonsRepo(f.db, readerOf(PortalSettings)).ahead({ studentId: 's1', since: 'S', until: 'U' });
    expect(out.map((l) => l.id)).toEqual(['a', 'b']);
    expect(f.argsOf('lesson_students', 'eq')).toEqual(['student_id', 's1']);
    expect(f.argsOf('lesson_students', 'gte')).toEqual(['lesson.ends_at', 'S']);
    expect(f.argsOf('lesson_students', 'lt')).toEqual(['lesson.starts_at', 'U']);
    expect(f.argsOf('lesson_students', 'neq')).toEqual(['lesson.status', 'rescheduled']);
    const select = String(f.argsOf('lesson_students', 'select')?.[0]);
    expect(select).toContain('teachers(display_name_ar, display_name_en, meeting_mode)');
    expect(select).not.toMatch(SECRET);
  });

  it('reports: submitted, ready and sent only, newest first; the lessons in a second read', async () => {
    const f = fakeDb({
      lesson_reports: [{ data: [{ id: 'r1', lesson_id: 'l1', sent_at: 'x', pdf_path: 'p' }] }],
      lessons: [{ data: [{ id: 'l1', starts_at: 'S', teacher: null }] }],
    });
    const rows = await new PortalReportsRepo(f.db).sent('s1');
    expect(rows).toEqual([{ id: 'r1', lesson_id: 'l1', sent_at: 'x', pdf_path: 'p', lesson: { starts_at: 'S', teacher: null } }]);
    const eqs = f.calls.filter((c) => c.table === 'lesson_reports' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['student_id', 's1'], ['status', 'submitted'], ['pdf_status', 'ready']]);
    expect(f.argsOf('lesson_reports', 'not')).toEqual(['sent_at', 'is', null]);
    expect(f.argsOf('lesson_reports', 'order')).toEqual(['sent_at', { ascending: false }]);
    expect(String(f.argsOf('lesson_reports', 'select')?.[0])).toBe('id, lesson_id, sent_at, pdf_path');
  });

  it('recordings: visible_to_student and done only; a group lesson is dropped', async () => {
    const f = fakeDb({
      lesson_recordings: [{ data: [
        { id: 'a', lesson_id: 'l1', file_path: 'f1', lessons: { lesson_students: [{ student_id: 's1' }] } },
        { id: 'b', lesson_id: 'l2', file_path: 'f2', lessons: { lesson_students: [{ student_id: 's1' }, { student_id: 's2' }] } },
      ] }],
    });
    expect(await new PortalReportsRepo(f.db).visibleRecordings(['l1', 'l2'])).toEqual([{ id: 'a', lesson_id: 'l1', file_path: 'f1' }]);
    const eqs = f.calls.filter((c) => c.table === 'lesson_recordings' && c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['visible_to_student', true], ['status', 'done']]);
    expect(await new PortalReportsRepo(fakeDb({}).db).visibleRecordings([])).toEqual([]);
  });

  it('package: no money column, FIFO order', async () => {
    const f = fakeDb({ subscriptions: [{ data: [] }] });
    await new PortalPackageRepo(f.db).packages('s1');
    expect(String(f.argsOf('subscriptions', 'select')?.[0])).not.toMatch(SECRET);
    expect(f.calls.filter((c) => c.method === 'order').map((c) => c.args[0])).toEqual(['starts_on', 'created_at', 'id']);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ 'rpc:portal_students_of': [{ error: { message: 'boom' } }] });
    await expect(new PortalScopeRepo(f.db).studentsOf('p1')).rejects.toThrow(/boom/);
  });
});
