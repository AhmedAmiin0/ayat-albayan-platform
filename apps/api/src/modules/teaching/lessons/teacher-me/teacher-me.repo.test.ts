import { describe, expect, it } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakeDb } from '@/modules/people/guardians/fake-db';
import { TEACHER_ID } from '@/modules/teaching/lessons/lessons.fakes';
import { LessonsSettings } from '@/modules/teaching/lessons/lessons.settings';
import { TeacherMeRepo } from './teacher-me.repo';

const ROW = { id: TEACHER_ID, display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo', meeting_link: null, meeting_mode: null };
const student = (id: string, name: string) => ({ id, code: `AB-${id}`, name, tz: 'Asia/Riyadh', status: 'active' });

describe('TeacherMeQueries.me (R-TCH-03)', () => {
  it('null when the profile has no teachers row', async () => {
    const { db, calls } = fakeDb({ teachers: [{ data: null }] });
    expect(await new TeacherMeRepo(db, readerOf(LessonsSettings)).me('p1')).toBeNull();
    expect(calls).toContainEqual({ table: 'teachers', method: 'eq', args: ['profile_id', 'p1'] });
  });

  it('students = distinct union of assigned students and students of my active rules, by name', async () => {
    const { db, calls } = fakeDb({
      teachers: [{ data: ROW }],
      students: [{ data: [student('2', 'مريم'), student('1', 'أحمد')] }],
      schedule_rules: [
        {
          data: [
            { schedule_rule_students: [{ student: student('2', 'مريم') }, { student: student('3', 'سهيلة') }] },
            { schedule_rule_students: [{ student: null }] },
          ],
        },
      ],
    });
    const me = await new TeacherMeRepo(db, readerOf(LessonsSettings)).me('p1');
    expect(me?.students.map((s) => s.name)).toEqual(['أحمد', 'سهيلة', 'مريم']);
    expect(me).toMatchObject({ id: TEACHER_ID, tz: 'Africa/Cairo' });
    expect(calls).toContainEqual({ table: 'students', method: 'eq', args: ['teacher_id', TEACHER_ID] });
    expect(calls).toContainEqual({ table: 'schedule_rules', method: 'eq', args: ['status', 'active'] });
  });

  it('a DB error on either list throws', async () => {
    const { db } = fakeDb({
      teachers: [{ data: ROW }],
      students: [{ error: { code: 'XX000', message: 'boom' } }],
      schedule_rules: [{ data: [] }],
    });
    await expect(new TeacherMeRepo(db, readerOf(LessonsSettings)).me('p1')).rejects.toThrow(/boom/);
  });

  it('meeting_mode raw and platform_classroom: the teacher\'s own mode, else the academy default', async () => {
    const me = (mode: string | null, auto: boolean) => {
      const { db } = fakeDb({ teachers: [{ data: { ...ROW, meeting_mode: mode } }], students: [{ data: [] }], schedule_rules: [{ data: [] }] });
      return new TeacherMeRepo(db, readerOf(LessonsSettings, { meeting_link_auto: auto })).me('p1');
    };
    expect(await me(null, true)).toMatchObject({ meeting_mode: null, platform_classroom: true });
    expect(await me('static', true)).toMatchObject({ meeting_mode: 'static', platform_classroom: false });
    expect(await me('platform', false)).toMatchObject({ meeting_mode: 'platform', platform_classroom: true });
  });
});
