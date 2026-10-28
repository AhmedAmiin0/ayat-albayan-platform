import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { loadFamilyExtras } from './family-source';

const REPORT = { id: 'r1', student_id: 's1', content: { segments: [{ kind: 'new', surah: 67, from: 16, to: 22, grade: 'good' }] }, submitted_at: '2026-10-27T14:00:00Z' };
const STARTS = '2026-10-27T13:00:00Z';
const AT = { startsAt: STARTS, now: new Date('2026-10-27T14:00:00Z') };

describe('loadFamilyExtras — the v2 reads of the family report', () => {
  it('reads the student’s other submitted v2 reports up to this one, and the next open lesson', async () => {
    const { db, calls } = fakeDb({
      lesson_reports: [{ data: [{ content: { segments: [{ kind: 'new', surah: 67, from: 1, to: 15, grade: 'good' }] } }, { content: 'broken' }] }],
      lessons: [{ data: { starts_at: '2026-10-29T13:00:00Z' } }],
    });
    const out = await loadFamilyExtras(db, REPORT, AT);
    expect(out.history).toEqual([{ kind: 'new', surah: 67, from: 1, to: 15, grade: 'good' }]);
    expect(out.content.segments).toHaveLength(1);
    expect(out.nextLessonAt).toBe('2026-10-29T13:00:00Z');
    const on = (table: string, method: string) => calls.filter((c) => c.table === table && c.method === method).map((c) => c.args);
    expect(on('lesson_reports', 'eq')).toEqual([['student_id', 's1'], ['form_version', 2], ['status', 'submitted']]);
    expect(on('lesson_reports', 'neq')).toEqual([['id', 'r1']]);
    expect(on('lesson_reports', 'lte')).toEqual([['submitted_at', REPORT.submitted_at]]);
    expect(on('lessons', 'gt')).toEqual([['starts_at', '2026-10-27T14:00:00.000Z']]);
    expect(on('lessons', 'in')).toEqual([['status', ['scheduled', 'confirmed']]]);
  });

  it('nothing booked → no next lesson; a read error fails the render (the job retries)', async () => {
    const none = fakeDb({ lesson_reports: [{ data: [] }], lessons: [{ data: null }] });
    expect((await loadFamilyExtras(none.db, REPORT, AT)).nextLessonAt).toBeNull();
    const bad = fakeDb({ lesson_reports: [{ error: { message: 'down' } }], lessons: [{ data: null }] });
    await expect(loadFamilyExtras(bad.db, REPORT, AT)).rejects.toThrow('v2 history read failed');
  });

  it('«الحلقة القادمة» starts after this lesson and after now: a late report never names a past lesson', async () => {
    const late = fakeDb({ lesson_reports: [{ data: [] }], lessons: [{ data: null }] });
    await loadFamilyExtras(late.db, REPORT, { startsAt: STARTS, now: new Date('2026-11-05T09:00:00Z') });
    const early = fakeDb({ lesson_reports: [{ data: [] }], lessons: [{ data: null }] });
    await loadFamilyExtras(early.db, REPORT, { startsAt: '2026-10-27T13:00:00+00:00', now: new Date('2026-10-27T12:00:00Z') });
    const gt = (c: typeof late.calls) => c.filter((x) => x.table === 'lessons' && x.method === 'gt').map((x) => x.args);
    expect(gt(late.calls)).toEqual([['starts_at', '2026-11-05T09:00:00.000Z']]);
    expect(gt(early.calls)).toEqual([['starts_at', '2026-10-27T13:00:00.000Z']]);
  });
});
