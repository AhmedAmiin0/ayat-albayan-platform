import { describe, expect, it } from 'vitest';
import { emptyDraft } from './draft';
import { bookHint, searchForStudent, teacherPatch } from './hint';
import { ABRAR, NOOR, SLOT } from './wizard-fixture';

const HINT = { teacherId: ABRAR.id, startsAt: SLOT };

describe('bookHint', () => {
  it('needs a teacher; the start is optional', () => {
    expect(bookHint({ teacherId: ABRAR.id, startsAt: SLOT })).toEqual(HINT);
    expect(bookHint({ teacherId: ABRAR.id })).toEqual({ teacherId: ABRAR.id, startsAt: null });
    expect(bookHint({ studentId: 's1' })).toBeNull();
  });
});

describe('teacherPatch', () => {
  it('the hinted teacher brings the hinted start', () => {
    expect(teacherPatch(emptyDraft(), { teacher: ABRAR }, HINT)).toEqual({ teacher: ABRAR, startsAt: SLOT, byday: [] });
  });

  it('another teacher drops a start picked for someone else', () => {
    const draft = { ...emptyDraft(), teacher: ABRAR, startsAt: SLOT, byday: [3] };
    expect(teacherPatch(draft, { teacher: NOOR }, HINT)).toEqual({ teacher: NOOR, startsAt: null, byday: [] });
    expect(teacherPatch(draft, { program: 'arabic', teacher: null }, null)).toEqual({ program: 'arabic', teacher: null, startsAt: null, byday: [] });
  });

  it('re-picking the same teacher or changing nothing about the teacher keeps the slot', () => {
    const draft = { ...emptyDraft(), teacher: ABRAR, startsAt: SLOT };
    expect(teacherPatch(draft, { teacher: ABRAR }, null)).toEqual({ teacher: ABRAR });
    expect(teacherPatch(draft, { genderPref: 'female' }, null)).toEqual({ genderPref: 'female' });
  });
});

describe('searchForStudent', () => {
  it('keeps the free gap (teacher + start) and drops lead fields', () => {
    const prev = { teacherId: ABRAR.id, startsAt: SLOT, leadId: 'l1', phone: '+966', pkg: 'trial' as const };
    expect(searchForStudent(prev, 's1')).toEqual({ studentId: 's1', teacherId: ABRAR.id, startsAt: SLOT });
    expect(searchForStudent({}, 's1')).toEqual({ studentId: 's1' });
  });

  it('the booking type picked before the student rides along, except the default subscription', () => {
    expect(searchForStudent({}, 's1', 'makeup')).toEqual({ studentId: 's1', kind: 'makeup' });
    expect(searchForStudent({}, 's1', 'trial')).toEqual({ studentId: 's1', kind: 'trial' });
    expect(searchForStudent({}, 's1', 'package')).toEqual({ studentId: 's1' });
  });
});
