import { describe, expect, it } from 'vitest';
import type { Db } from '../../../../common/db/db.module';
import { fakeDb } from '../../../people/guardians/fake-db';
import { TrialDateQueries } from '../../../teaching/booking';
import { SalesStudentQueries } from './sales-student.queries';

const FROM = new Date('2026-10-27T10:00:00.000Z');
const TO = new Date('2026-11-10T10:00:00.000Z');
const queriesOf = (db: Db) => new SalesStudentQueries(db, new TrialDateQueries(db));
const SECRET = /meeting|link|subscription|price|amount/;

describe('SalesStudentQueries «الجدول» (whitelisted selects)', () => {
  it('upcoming: the student\'s open lessons in [from, to), by start, at most `limit`; no link or money column', async () => {
    const f = fakeDb({ lessons: [{ data: [] }] });
    await queriesOf(f.db).upcoming('s1', { from: FROM, to: TO, limit: 20 });
    expect(f.argsOf('lessons', 'eq')).toEqual(['own.student_id', 's1']);
    expect(f.argsOf('lessons', 'gte')).toEqual(['starts_at', FROM.toISOString()]);
    expect(f.argsOf('lessons', 'lt')).toEqual(['starts_at', TO.toISOString()]);
    expect(f.argsOf('lessons', 'in')).toEqual(['status', ['scheduled', 'confirmed']]);
    expect(f.argsOf('lessons', 'order')).toEqual(['starts_at']);
    expect(f.argsOf('lessons', 'limit')).toEqual([20]);
    const select = String(f.argsOf('lessons', 'select')?.[0]);
    expect(select).not.toContain('*');
    expect(select).not.toMatch(SECRET);
  });

  it('rules: the student\'s active rules with both teacher names; no link, subscription or money column', async () => {
    const f = fakeDb({ schedule_rule_students: [{ data: [] }] });
    await queriesOf(f.db).rules('s1');
    const eqs = f.calls.filter((c) => c.method === 'eq').map((c) => c.args);
    expect(eqs).toEqual([['student_id', 's1'], ['rule.status', 'active']]);
    const select = String(f.argsOf('schedule_rule_students', 'select')?.[0]);
    expect(select).toContain('teachers(display_name_ar, display_name_en)');
    expect(select).not.toContain('*');
    expect(select).not.toMatch(SECRET);
  });

  it('student: its zone for «عند الطالب»', async () => {
    const f = fakeDb({ students: [{ data: null }] });
    await queriesOf(f.db).student('s1');
    expect(String(f.argsOf('students', 'select')?.[0])).toMatch(/^id, code, name, status, program, tz, /);
  });

  it('a database error becomes an error', async () => {
    const f = fakeDb({ lessons: [{ error: { message: 'boom' } }] });
    await expect(queriesOf(f.db).upcoming('s1', { from: FROM, to: TO, limit: 20 })).rejects.toThrow(/boom/);
  });
});
