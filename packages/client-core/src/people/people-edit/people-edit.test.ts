import { describe, expect, it } from 'vitest';
import {
  ApiError,
  familyFormOf,
  familyPatchOf,
  newFamilyOf,
  peopleEditErrorText,
  peopleEditPaths,
  roleActions,
  studentFormOf,
  studentPatchOf,
} from '../../index.js';
import { VIEW } from './people-edit.fixtures.js';

describe('people-edit forms', () => {
  it('sends only the changed student fields: blank → null, the age a number', () => {
    const initial = studentFormOf(VIEW.student);
    expect(initial.age).toBe('12');
    const result = studentPatchOf(initial, {
      ...initial,
      name: 'سهيلة أحمد',
      age: '13',
      notes: 'جديدة',
      level: '',
    });
    expect(result).toEqual({ patch: { name: 'سهيلة أحمد', age: 13, notes: 'جديدة' }, invalid: [] });
    expect(studentPatchOf(initial, { ...initial, age: '' })).toEqual({
      patch: { age: null },
      invalid: [],
    });
    expect(studentPatchOf(initial, initial)).toEqual({ patch: {}, invalid: [] });
  });

  it('names the failing fields: an empty name, an age out of range', () => {
    const initial = studentFormOf(VIEW.student);
    expect(studentPatchOf(initial, { ...initial, name: ' ', age: '200' }).invalid.sort()).toEqual([
      'age',
      'name',
    ]);
  });

  it('parses the family phone to E.164 and refuses a bad one', () => {
    const initial = familyFormOf(VIEW.guardian);
    expect(familyPatchOf(initial, { ...initial, phone_e164: '+20 100 000 0009' })).toEqual({
      patch: { phone_e164: '+201000000009' },
      invalid: [],
    });
    expect(familyPatchOf(initial, { ...initial, phone_e164: 'abc' }).invalid).toEqual([
      'phone_e164',
    ]);
  });
});

describe('newFamilyOf', () => {
  it('parses a new family, names the bad fields', () => {
    const ok = newFamilyOf({
      name: ' أبو سهيلة ',
      phone_e164: '+201000000003',
      tz: 'Africa/Cairo',
    });
    expect(ok).toEqual({
      patch: { name: 'أبو سهيلة', phone_e164: '+201000000003', tz: 'Africa/Cairo' },
      invalid: [],
    });
    expect(
      newFamilyOf({ name: '', phone_e164: '0100', tz: 'Africa/Cairo' }).invalid.sort(),
    ).toEqual(['name', 'phone_e164']);
  });
});

describe('roleActions', () => {
  it('offers every action for a plain child without a login', () => {
    expect(roleActions(VIEW)).toEqual({
      selfOn: false,
      canSetSelf: true,
      canGuardianToStudent: true,
      canStudentToGuardian: true,
      canMove: true,
    });
  });

  it('another child holds the number; a student login blocks «تحويل إلى ولي أمر»', () => {
    const other = { id: 's2', code: 'AB-0184', name: 'أحمد', contact_is_self: true };
    const view = {
      student: { ...VIEW.student, has_login: true },
      guardian: { ...VIEW.guardian, students: [...VIEW.guardian.students, other] },
    };
    expect(roleActions(view)).toEqual({
      selfOn: false,
      canSetSelf: false,
      canGuardianToStudent: false,
      canStudentToGuardian: false,
      canMove: false,
    });
  });

  it('history blocks «تحويل إلى ولي أمر»; the adult learner of a family login cannot move', () => {
    const records = { ...VIEW, student: { ...VIEW.student, has_records: true } };
    expect(roleActions(records).canStudentToGuardian).toBe(false);
    const self = {
      student: { ...VIEW.student, contact_is_self: true },
      guardian: { ...VIEW.guardian, has_login: true },
    };
    expect(roleActions(self).canMove).toBe(false);
    expect(roleActions({ ...VIEW, guardian: { ...VIEW.guardian, has_login: true } }).canMove).toBe(
      true,
    );
  });
});

describe('paths and errors', () => {
  it('encodes ids, phones and searches', () => {
    expect(peopleEditPaths.secondPhone('g1', '+201000000002')).toBe(
      '/people/guardians/g1/phones/%2B201000000002',
    );
    expect(peopleEditPaths.families('AB 0183')).toBe('/people/guardians?search=AB%200183');
    expect(peopleEditPaths.toGuardian('s1')).toBe('/people/students/s1/to-guardian');
  });

  it('maps an API code to its sentence, anything else to the generic one', () => {
    const text = { generic: 'تعذّر الحفظ.', same_guardian: 'في هذه العائلة أصلًا.' };
    expect(peopleEditErrorText(new ApiError(409, { code: 'same_guardian' }), text)).toBe(
      'في هذه العائلة أصلًا.',
    );
    expect(peopleEditErrorText(new ApiError(500, {}), text)).toBe('تعذّر الحفظ.');
    expect(peopleEditErrorText(new Error('x'), text)).toBe('تعذّر الحفظ.');
  });
});
