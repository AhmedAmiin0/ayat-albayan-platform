import { describe, expect, it, vi } from 'vitest';
import {
  editBody,
  initialCreateForm,
  initialEditForm,
  recordMissing,
  recordView,
  roleLocked,
  roleSection,
  teacherModes,
  withRole,
  type EditForm,
} from '../../index';
import { detail } from './fixtures.test-util';

const pick = { id: 's1', kind: 'student', name: 'يوسف', code: 'AB-0001' } as const;
const teacherRow = { display_name_ar: ' أبرار ', display_name_en: '', gender: 'female' as const };
const blank = () => initialEditForm(detail(), []);

describe('the edit form record of a new teacher, student or guardian role', () => {
  it('locks the role of a linked login or of a record-backed role only', () => {
    expect(roleLocked(detail())).toBe(false);
    expect(roleLocked(detail({ role: 'teacher' }))).toBe(true);
    expect(roleLocked(detail({ linked: pick }))).toBe(true);
  });

  it('a record-backed role waits for its record; a staff role never does', () => {
    const d = detail();
    const f = blank();
    expect(recordMissing(d, f)).toBe(false);
    expect(recordMissing(d, { ...f, role: 'student' })).toBe(true);
    expect(recordMissing(d, { ...f, role: 'student', linked: pick })).toBe(false);
    expect(recordMissing(d, { ...f, role: 'guardian', linked: pick })).toBe(true);
    const fresh = { ...f, role: 'teacher' as const, teacherMode: 'new' as const };
    expect(recordMissing(d, fresh)).toBe(true);
    expect(recordMissing(d, { ...fresh, newTeacher: teacherRow })).toBe(false);
  });

  it('sends the picked record or the new teacher beside the role', () => {
    const d = detail();
    const f = blank();
    const student = editBody(d, { ...f, role: 'student', linked: pick }, []);
    expect(student).toEqual({ role: 'student', role_id: null, linked_id: 's1' });
    const fresh = { ...f, role: 'teacher' as const, teacherMode: 'new' as const };
    const teacher = { display_name_ar: 'أبرار', gender: 'female' };
    const body = editBody(d, { ...fresh, newTeacher: teacherRow }, []);
    expect(body).toEqual({ role: 'teacher', role_id: null, new_teacher: teacher });
  });

  it('sends no record for a locked role', () => {
    const d = detail({ role: 'teacher', linked: { ...pick, kind: 'teacher' } });
    const f = initialEditForm(d, []);
    const body = editBody(d, { ...f, full_name: 'هدى سالم', linked: pick }, []);
    expect(body).toEqual({ full_name: 'هدى سالم' });
  });
});

describe('the role section', () => {
  const text = { roleLocked: 'locked', roleRecord: 'record' };
  const section = (f: EditForm, roleLocked = false) =>
    roleSection({ form: f, readOnly: false, roleLocked }, text);

  it('asks for a record for a record-backed role of an unlocked login, and says so', () => {
    const guardian = { ...blank(), role: 'guardian' as const };
    expect(section(guardian)).toMatchObject({ recordKind: 'guardian', picker: { hint: 'record' } });
    const locked = { recordKind: null, picker: { hint: 'locked', disabled: true } };
    expect(section(guardian, true)).toMatchObject(locked);
    const staff = { role: 'assistant', roleId: '', disabled: false, hint: undefined };
    expect(section(blank())).toEqual({ recordKind: null, picker: staff });
  });

  it('keeps the picked record only when it fits the new role', () => {
    const f = { ...blank(), linked: pick };
    const student = { role: 'student', role_id: '', linked: pick };
    expect(withRole(f, { role: 'student', roleId: '' })).toEqual(student);
    const teacher = { role: 'teacher', role_id: 'r1', linked: null };
    expect(withRole(f, { role: 'teacher', roleId: 'r1' })).toEqual(teacher);
  });
});

describe('the record section of the create and edit forms', () => {
  const value = { ...initialCreateForm(), linked: pick };

  it('a student or guardian shows the picker only', () => {
    const onChange = vi.fn();
    const view = recordView('student', value, onChange);
    expect([view.mode, view.newTeacher, view.picker?.value]).toEqual([null, null, pick]);
    view.picker?.onChange(null);
    expect(onChange).toHaveBeenCalledWith({ linked: null });
  });

  it('a teacher chooses existing or new; new shows the teacher fields, not the picker', () => {
    const onChange = vi.fn();
    expect(recordView('teacher', value, onChange).mode?.value).toBe('existing');
    const fresh = recordView('teacher', { ...value, teacherMode: 'new' }, onChange);
    expect(fresh.picker).toBeNull();
    fresh.mode?.onChange('existing');
    fresh.newTeacher?.onChange(value.newTeacher);
    const calls = [[{ teacherMode: 'existing' }], [{ newTeacher: value.newTeacher }]];
    expect(onChange.mock.calls).toEqual(calls);
  });
});

describe('teacherModes', () => {
  it('offers an existing teacher first, then a new one, in the app language', () => {
    const modes = teacherModes({ existingTeacher: 'existing', newTeacher: 'new' });
    expect(modes).toEqual([
      { value: 'existing', label: 'existing' },
      { value: 'new', label: 'new' },
    ]);
  });
});
