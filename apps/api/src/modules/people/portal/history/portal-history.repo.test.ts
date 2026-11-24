import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { PortalReportsRepo } from '@/modules/people/portal/reports/portal-reports.repo';
import { PortalHistoryRepo } from './portal-history.repo';

/** Never the meeting link, notes, a price or another student's row. */
const SECRET = /meeting_link|notes|price|amount|phone|email|\*/;

describe('portal history reads (service role, whitelisted selects)', () => {
  it('a keyset batch: this student\'s own row, before the cursor, newest first', async () => {
    const f = fakeDb({ lessons: [{ data: [{ id: 'l1' }] }] });
    const rows = await new PortalHistoryRepo(f.db).before({ studentId: 's1', before: 'C', limit: 60 });
    expect(rows).toEqual([{ id: 'l1' }]);
    expect(f.argsOf('lessons', 'eq')).toEqual(['own.student_id', 's1']);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', 'C']);
    expect(f.argsOf('lessons', 'order')).toEqual(['starts_at', { ascending: false }]);
    expect(f.argsOf('lessons', 'limit')).toEqual([60]);
    const select = String(f.argsOf('lessons', 'select')?.[0]);
    expect(select).toContain('own:lesson_students!inner(student_id, attendance)');
    expect(select).not.toMatch(SECRET);
  });

  it('the month: [from, to) by start', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    const from = new Date('2026-10-01T00:00:00Z');
    const to = new Date('2026-10-27T08:00:00Z');
    await new PortalHistoryRepo(f.db).between({ studentId: 's1', from, to });
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', from.toISOString()]);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', to.toISOString()]);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    const read = new PortalHistoryRepo(f.db).before({ studentId: 's1', before: 'C', limit: 1 });
    await expect(read).rejects.toThrow(/boom/);
  });
});

describe('portal reports: the sent rule reused for the history and «ما المطلوب»', () => {
  it('sentOf: the sent reports of these lessons only; none asked, none read', async () => {
    const f = fakeDb({ lesson_reports: [{ data: [{ id: 'r1', lesson_id: 'l1', sent_at: 'S', pdf_path: 'p' }] }] });
    const out = await new PortalReportsRepo(f.db).sentOf({ studentId: 's1', lessonIds: ['l1'] });
    expect(out).toEqual([{ id: 'r1', lesson_id: 'l1' }]);
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['student_id', 's1'], ['status', 'submitted'], ['pdf_status', 'ready']]);
    expect(f.argsOf('lesson_reports', 'not')).toEqual(['sent_at', 'is', null]);
    expect(f.argsOf('lesson_reports', 'in')).toEqual(['lesson_id', ['l1']]);
    const none = fakeDb({});
    expect(await new PortalReportsRepo(none.db).sentOf({ studentId: 's1', lessonIds: [] })).toEqual([]);
    expect(none.trips).toEqual([]);
  });

  it('texts: homework and next plan of one report; the newest sent is limit 1', async () => {
    const f = fakeDb({ lesson_reports: [{ data: { homework: 'h', next_plan: 'n' } }, { data: [] }] });
    const repo = new PortalReportsRepo(f.db);
    expect(await repo.texts('r1')).toEqual({ homework: 'h', next_plan: 'n' });
    expect(String(f.argsOf('lesson_reports', 'select')?.[0])).toBe('homework, next_plan');
    expect(await repo.sent('s1', 1)).toEqual([]);
    expect(f.calls.find((c) => c.method === 'limit')?.args).toEqual([1]);
  });
});
