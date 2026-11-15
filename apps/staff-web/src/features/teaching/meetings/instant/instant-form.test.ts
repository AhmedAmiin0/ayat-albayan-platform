import { describe, expect, it } from 'vitest';
import { draftProblem, instantBody, toggleStudent, type InstantDraft, type MeetingStudent } from './instant-form';

const A: MeetingStudent = { id: 'a', name: 'سهيلة', code: 'AB-0001', program: 'quran' };
const B: MeetingStudent = { id: 'b', name: 'مريم', code: 'AB-0002', program: 'quran' };
const draft = (over: Partial<InstantDraft> = {}): InstantDraft => ({ students: [A], teacherId: 't', durationMin: 30, reason: '', ...over });

describe('draftProblem', () => {
  it('needs a student, then a teacher', () => {
    expect(draftProblem(draft({ students: [] }), false)).toBe('students');
    expect(draftProblem(draft({ teacherId: '' }), false)).toBe('teacher');
    expect(draftProblem(draft(), false)).toBeNull();
  });

  it('after a clash, needs a reason (spaces do not count)', () => {
    expect(draftProblem(draft({ reason: '  ' }), true)).toBe('reason');
    expect(draftProblem(draft({ reason: 'طارئ' }), true)).toBeNull();
  });
});

describe('instantBody', () => {
  it('sends ids, teacher, duration and the request id; no override before a clash', () => {
    expect(instantBody(draft({ students: [A, B], reason: 'x' }), { clashed: false, requestId: 'r1' })).toEqual({
      studentIds: ['a', 'b'],
      teacherId: 't',
      durationMin: 30,
      clientRequestId: 'r1',
    });
  });

  it('adds the trimmed reason as override after a clash', () => {
    expect(instantBody(draft({ reason: ' طارئ ' }), { clashed: true, requestId: 'r1' }).override).toEqual({ reason: 'طارئ' });
  });
});

describe('toggleStudent', () => {
  it('adds once and removes on a second pick', () => {
    const one = toggleStudent([], A);
    expect(one).toEqual([A]);
    expect(toggleStudent(toggleStudent(one, B), A)).toEqual([B]);
  });
});
