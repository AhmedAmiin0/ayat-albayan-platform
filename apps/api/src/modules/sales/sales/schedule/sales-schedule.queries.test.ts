import { describe, expect, it } from 'vitest';
import { fakeDb } from '../../../people/guardians/fake-db';
import { SalesScheduleQueries } from './sales-schedule.queries';

const FROM = new Date('2026-10-10T21:00:00.000Z');
const TO = new Date('2026-10-11T21:00:00.000Z');

describe('SalesScheduleQueries (whitelisted selects)', () => {
  it('day: lessons starting in the range, moved-away ones left out, by start; no link, reason or money column', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    await new SalesScheduleQueries(f.db).day({ from: FROM, to: TO });
    expect(String(f.argsOf('lessons', 'select')?.[0])).not.toMatch(/meeting|reason|note|attendance|price|amount|chargeable|phone/);
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', FROM.toISOString()]);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', TO.toISOString()]);
    expect(f.argsOf('lessons', 'neq')).toEqual(['status', 'rescheduled']);
    expect(f.argsOf('lessons', 'eq')).toBeUndefined();
  });

  it('day with a teacher: filtered on teacher_id', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    await new SalesScheduleQueries(f.db).day({ from: FROM, to: TO, teacherId: 'tc1' });
    expect(f.argsOf('lessons', 'eq')).toEqual(['teacher_id', 'tc1']);
  });

  it('upcoming: open lessons only, students’ ids only', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    await new SalesScheduleQueries(f.db).upcoming({ from: FROM, to: TO });
    expect(f.argsOf('lessons', 'select')).toEqual(['starts_at, lesson_students(student_id)']);
    expect(f.argsOf('lessons', 'in')).toEqual(['status', ['scheduled', 'confirmed']]);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    await expect(new SalesScheduleQueries(f.db).day({ from: FROM, to: TO })).rejects.toThrow(/boom/);
  });
});
