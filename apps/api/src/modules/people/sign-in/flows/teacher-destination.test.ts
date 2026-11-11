import { describe, expect, it } from 'vitest';
import type { TeacherRec } from '@/modules/people/sign-in/sign-in.ports';
import { teacherCodePhone, teacherLoginId } from './teacher-destination';

const RECORD = '+966500000002';
const LOGIN = '+966500000004';
const base: TeacherRec = {
  id: 't1',
  name: 'المعلمة',
  tz: 'Africa/Cairo',
  recordPhone: RECORD,
  profileId: null,
  login: null,
};
const login = (over: Partial<NonNullable<TeacherRec['login']>>): TeacherRec => ({
  ...base,
  profileId: 'p1',
  login: { id: 'p1', role: 'teacher', disabled: false, phone: LOGIN, ...over },
});

describe('teacherCodePhone (docs/46 D2)', () => {
  it('no login: the record phone (or nowhere without one)', () => {
    expect(teacherCodePhone(base)).toBe(RECORD);
    expect(teacherCodePhone({ ...base, recordPhone: null })).toBeNull();
  });

  it("a teacher login: only its own phone, never the record's", () => {
    expect(teacherCodePhone(login({}))).toBe(LOGIN);
    expect(teacherCodePhone(login({ phone: null }))).toBeNull();
  });

  it('a disabled login or another role gets nothing', () => {
    expect(teacherCodePhone(login({ disabled: true }))).toBeNull();
    expect(teacherCodePhone(login({ role: 'admin' }))).toBeNull();
    expect(teacherCodePhone(login({ role: 'guardian' }))).toBeNull();
  });
});

describe('teacherLoginId (docs/46 A5)', () => {
  it('only an enabled teacher login', () => {
    expect(teacherLoginId(login({}))).toBe('p1');
    expect(teacherLoginId(login({ role: 'admin' }))).toBeNull();
    expect(teacherLoginId(login({ disabled: true }))).toBeNull();
    expect(teacherLoginId(base)).toBeNull();
    expect(teacherLoginId(null)).toBeNull();
  });
});
