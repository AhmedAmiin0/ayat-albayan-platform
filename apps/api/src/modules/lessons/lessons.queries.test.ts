import { describe, expect, it } from 'vitest';
import { fakeDb } from '../guardians/fake-db';
import { LESSON_SELECT } from './lesson-row';
import { lessonRow, STUDENT_ID } from './lessons.fakes';
import { LessonsQueries } from './lessons.queries';

const FROM = new Date('2026-10-03T21:00:00Z');
const TO = new Date('2026-10-10T21:00:00Z');
const methods = (calls: { table: string; method: string; args: unknown[] }[], table: string) =>
  calls.filter((c) => c.table === table).map((c) => [c.method, ...c.args]);

describe('LessonsQueries (service role; docs/10 routes 1–5)', () => {
  it('window: starts_at ∈ [from, to), optional teacher, stable order, ranged', async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [lessonRow()] }] });
    const rows = await new LessonsQueries(db).window({ from: FROM, to: TO, teacherId: 't1' });
    expect(rows).toHaveLength(1);
    expect(methods(calls, 'lessons')).toEqual([
      ['select', LESSON_SELECT],
      ['gte', 'starts_at', FROM.toISOString()],
      ['lt', 'starts_at', TO.toISOString()],
      ['eq', 'teacher_id', 't1'],
      ['order', 'starts_at'],
      ['order', 'id'],
      ['range', 0, 999],
    ]);
  });

  it('window without teacherId does not filter by teacher', async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [] }] });
    await new LessonsQueries(db).window({ from: FROM, to: TO });
    expect(calls.some((c) => c.method === 'eq')).toBe(false);
  });

  it("studentPage: inner-joined on the student, newest first, rows re-read with all students in page order", async () => {
    const { db, calls } = fakeDb({
      lessons: [
        { data: [{ id: 'b' }, { id: 'a' }], count: 2 },
        { data: [lessonRow({ id: 'a' }), lessonRow({ id: 'b' })] },
      ],
    });
    const page = await new LessonsQueries(db).studentPage(STUDENT_ID, { page: 1, pageSize: 25 });
    expect(page.items.map((r) => r.id)).toEqual(['b', 'a']);
    expect(page.total).toBe(2);
    expect(calls).toContainEqual({ table: 'lessons', method: 'eq', args: ['lesson_students.student_id', STUDENT_ID] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'order', args: ['starts_at', { ascending: false }] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'in', args: ['id', ['b', 'a']] });
  });

  it('openOfRule: scheduled / confirmed lessons of the rule from the cutoff', async () => {
    const { db, calls } = fakeDb({ lessons: [{ data: [] }] });
    await new LessonsQueries(db).openOfRule('r1', FROM);
    expect(calls).toContainEqual({ table: 'lessons', method: 'in', args: ['status', ['scheduled', 'confirmed']] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'gte', args: ['starts_at', FROM.toISOString()] });
    expect(calls).toContainEqual({ table: 'lessons', method: 'eq', args: ['rule_id', 'r1'] });
  });

  it('seq: chunks of 100 lesson ids, keyed lesson:student, null rows skipped', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `l${i}`);
    const { db, calls } = fakeDb({
      v_lesson_sequence: [
        { data: [{ lesson_id: 'l1', student_id: 's1', seq: 3 }, { lesson_id: null, student_id: 's1', seq: 1 }] },
        { data: [{ lesson_id: 'l120', student_id: 's1', seq: 9 }] },
      ],
    });
    const seq = await new LessonsQueries(db).seq(ids);
    expect([...seq]).toEqual([
      ['l1:s1', 3],
      ['l120:s1', 9],
    ]);
    const chunks = calls.filter((c) => c.method === 'in').map((c) => (c.args[1] as string[]).length);
    expect(chunks).toEqual([100, 50]);
  });

  it('no ids → no query (byIds, contacts, seq)', async () => {
    const { db, calls } = fakeDb({});
    const q = new LessonsQueries(db);
    expect(await q.byIds([])).toEqual([]);
    expect(await q.contacts([])).toEqual([]);
    expect(await q.seq([])).toEqual(new Map());
    expect(calls).toEqual([]);
  });

  it('get / studentExists / contacts read one row or list', async () => {
    const { db } = fakeDb({
      lessons: [{ data: lessonRow() }],
      students: [{ data: null }, { data: [{ id: 's1', name: 'سهيلة', guardian: null }] }],
    });
    const q = new LessonsQueries(db);
    expect((await q.get('x'))?.id).toBe(lessonRow().id);
    expect(await q.studentExists('nope')).toBe(false);
    expect(await q.contacts(['s1'])).toEqual([{ id: 's1', name: 'سهيلة', guardian: null }]);
  });

  it('a DB error becomes an exception', async () => {
    const { db } = fakeDb({ lessons: [{ error: { code: 'XX000', message: 'boom' } }] });
    await expect(new LessonsQueries(db).get('x')).rejects.toThrow(/boom/);
  });
});
