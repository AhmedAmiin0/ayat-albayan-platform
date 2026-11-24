import type { LessonStatus } from '@ab/catalog';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { pastRow } from './portal.family.fakes';
import { portalApp, R1, REC, S1, S2, S3 } from './portal.fakes';

type App = Awaited<ReturnType<typeof portalApp>>;
const url = (id: string, query: string) => `/portal/students/${id}/history?${query}`;
const NOW = '2026-10-27T08:00:00.000Z';

// docs/50 §5 item 1: newest first, keyset; same scope as /portal.
describe('GET /portal/students/:id/history', () => {
  let t: App;
  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(NOW));
    t = await portalApp();
  });
  afterAll(async () => {
    vi.useRealTimers();
    await t.app.close();
  });
  beforeEach(() => vi.clearAllMocks());

  it('attended: the held lesson with its sent report and visible recording, from now', async () => {
    t.reports.visibleRecordings.mockResolvedValueOnce([{ id: REC, lesson_id: 'l-20', file_path: 'x' }]);
    const res = await t.call('GET', url(S1, 'status=attended'), 'student1');
    expect(res.json()).toEqual({
      rows: [{
        lesson_id: 'l-20', starts_at: '2026-10-20T16:00:00.000Z', ends_at: '2026-10-20T16:30:00.000Z',
        teacher: { display_name_ar: 'أبرار', display_name_en: 'Abrar' }, outcome: 'attended',
        absence_reason: null, report_id: R1, recording_id: REC,
      }],
      next_cursor: null,
    });
    expect(t.history.before).toHaveBeenCalledWith({ studentId: S1, before: NOW, limit: 60 });
    expect(t.reports.sentOf).toHaveBeenCalledWith({ studentId: S1, lessonIds: ['l-20'] });
  });

  it('absent: the excused lesson with the family\'s reason and the no-show; after the cursor', async () => {
    const cursor = '2026-10-21T00:00:00.000Z';
    const res = await t.call('GET', url(S1, `status=absent&cursor=${cursor}`), 'guardianA');
    interface Row { lesson_id: string; outcome: string; absence_reason: string | null }
    const rows = res.json().rows as Row[];
    expect(rows.map((r) => [r.lesson_id, r.outcome, r.absence_reason])).toEqual([
      ['l-18', 'excused', 'سفر العائلة'],
      ['l-15', 'absent', null],
    ]);
    expect(t.history.before).toHaveBeenCalledWith({ studentId: S1, before: cursor, limit: 60 });
  });

  it('a full page (20) ends at its own last row; cancelled lessons are in no list', async () => {
    const at = (i: number) => new Date(Date.parse('2026-10-20T16:00:00Z') - i * 3_600_000).toISOString();
    const status = (i: number): LessonStatus => (i % 2 === 1 ? 'no_show' : 'cancelled_by_admin');
    const batch = Array.from({ length: 60 }, (_, i) => pastRow(`l-${i}`, { starts_at: at(i), status: status(i) }));
    t.history.before.mockResolvedValueOnce(batch);
    const res = (await t.call('GET', url(S1, 'status=absent'), 'guardianA')).json();
    expect(res.rows).toHaveLength(20);
    expect(res.next_cursor).toBe(at(39));
  });

  it('a bad status or cursor is 400; another family\'s student is 404 and nothing is read', async () => {
    for (const q of ['status=present', '', 'status=absent&cursor=yesterday']) {
      expect([q, (await t.call('GET', url(S1, q), 'guardianA')).statusCode]).toEqual([q, 400]);
    }
    for (const [who, id] of [['guardianB', S1], ['guardianA', S3], ['student1', S2]] as const) {
      const res = await t.call('GET', url(id, 'status=attended'), who);
      expect([who, res.statusCode, res.json().code]).toEqual([who, 404, 'student_not_found']);
    }
    expect(t.history.before).not.toHaveBeenCalled();
  });
});
