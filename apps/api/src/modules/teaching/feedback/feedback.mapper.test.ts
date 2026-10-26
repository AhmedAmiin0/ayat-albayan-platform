import { describe, expect, it } from 'vitest';
import { GUARDIAN_PHONE, listRow, NOW, publicContext, STUDENT_ID, TEACHER_ID } from './feedback.fakes';
import { answerOf, peopleOf, toFormView, toRowView, toSummary, toTeacherRowView } from './feedback.mapper';

const people = peopleOf(
  [{ id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' }],
  [{ id: TEACHER_ID, display_name_ar: 'أبرار' }],
);

describe('feedback mapper', () => {
  it('the admin row carries the family phone and the teacher', () => {
    const v = toRowView(listRow(), people);
    expect(v).toMatchObject({
      student: { id: STUDENT_ID, code: 'AB-0183', name: 'سهيلة' },
      teacher: { id: TEACHER_ID, name: 'أبرار' },
      rating: 5,
      recommend: 'yes',
      contact_phone: '+966509999999',
    });
  });

  it('a teacher keeps the student name, but never the phone, the guardian or the link hash', () => {
    const v = toTeacherRowView(listRow(), people);
    expect(v.student.name).toBe('سهيلة');
    expect(Object.keys(v)).not.toContain('contact_phone');
    expect(Object.keys(v)).not.toContain('guardian_id');
    expect(Object.keys(v)).not.toContain('token_hash');
    expect(Object.keys(v)).not.toContain('teacher');
  });

  it('the public form view is the teacher, the kind and the prefilled phone only', () => {
    expect(toFormView(publicContext())).toEqual({
      teacherName: 'أبرار',
      kind: 'subscription',
      contactPhone: GUARDIAN_PHONE,
      alreadySubmitted: false,
    });
    expect(toFormView(publicContext({ submitted_at: NOW.toISOString(), contact_phone: '+20100000000' }))).toMatchObject({
      contactPhone: '+20100000000',
      alreadySubmitted: true,
    });
  });

  it('an answer without a typed phone keeps the number the link went to', () => {
    const ctx = publicContext();
    expect(answerOf({ rating: 4, recommend: 'maybe' }, ctx, NOW)).toEqual({
      rating: 4,
      recommend: 'maybe',
      note: null,
      contact_phone: GUARDIAN_PHONE,
      submitted_at: NOW.toISOString(),
    });
    expect(answerOf({ rating: 5, recommend: 'yes', note: 'شكرًا', contactPhone: '+20100000000' }, ctx, NOW)).toMatchObject({
      note: 'شكرًا',
      contact_phone: '+20100000000',
    });
  });

  it('summary names the teacher', () => {
    expect(toSummary({ teacher_id: TEACHER_ID, avg_rating: 4.5, n: 2, recommend_yes_pct: 50 }, people)).toEqual({
      teacher: { id: TEACHER_ID, name: 'أبرار' },
      avg_rating: 4.5,
      n: 2,
      recommend_yes_pct: 50,
    });
  });
});
