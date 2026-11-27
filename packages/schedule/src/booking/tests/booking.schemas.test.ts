import { describe, expect, it } from 'vitest';
import {
  bookingTeacherOptionSchema,
  outsideSlotsQuerySchema,
  slotsQuerySchema,
  slotsResponseSchema,
  teacherOptionsQuerySchema,
} from '../booking.schemas';

const TEACHER = '11111111-1111-4111-8111-111111111111';
const STUDENT = '22222222-2222-4222-8222-222222222222';
const OPTION = {
  id: TEACHER,
  display_name_ar: 'T',
  gender: 'female',
  programs: ['quran'],
  tz: 'Africa/Cairo',
  meeting_link: null,
  platform_classroom: true,
  students_count: 3,
  max_students: null,
  has_availability: true,
};
const GRID = { teacherId: TEACHER, durationMin: '45' };

describe('teacherOptionsQuerySchema (docs/10 §5 #12)', () => {
  it('takes a student or a program', () => {
    expect(teacherOptionsQuerySchema.parse({ studentId: STUDENT })).toEqual({ studentId: STUDENT });
    expect(teacherOptionsQuerySchema.parse({ program: 'quran' })).toEqual({ program: 'quran' });
  });

  it('refuses neither a student nor a program', () => {
    expect(teacherOptionsQuerySchema.safeParse({ gender: 'male' }).success).toBe(false);
  });
});

describe('slotsQuerySchema and outsideSlotsQuerySchema (docs/10 §5 #13)', () => {
  it('reads a comma list of students and a numeric length', () => {
    const query = { ...GRID, studentIds: `${STUDENT}, ${STUDENT}` };
    const parsed = outsideSlotsQuerySchema.parse(query);
    expect(parsed).toMatchObject({ durationMin: 45, studentIds: [STUDENT, STUDENT] });
  });

  it('refuses a length the slots never offer', () => {
    expect(outsideSlotsQuerySchema.safeParse({ ...GRID, durationMin: '50' }).success).toBe(false);
  });

  it('needs the window to run forward', () => {
    const from = '2026-12-01T00:00:00Z';
    const to = '2026-12-02T00:00:00Z';
    expect(slotsQuerySchema.safeParse({ ...GRID, from, to }).success).toBe(true);
    expect(slotsQuerySchema.safeParse({ ...GRID, from: to, to: from }).success).toBe(false);
  });
});

describe('booking answers', () => {
  it('answers a teacher option with its load and availability', () => {
    expect(bookingTeacherOptionSchema.parse(OPTION)).toEqual(OPTION);
    const noGender = { ...OPTION, gender: null };
    expect(bookingTeacherOptionSchema.safeParse(noGender).success).toBe(false);
  });

  it('answers the slots with the teacher zone, the step and each start', () => {
    const slot = { starts_at: '2026-12-01T15:00:00Z', ends_at: '2026-12-01T15:45:00Z' };
    const grid = { teacher_tz: 'Africa/Cairo', step_min: 45, slots: [{ ...slot, conflicts: [] }] };
    expect(slotsResponseSchema.parse(grid)).toEqual(grid);
    expect(slotsResponseSchema.safeParse({ ...grid, slots: [slot] }).success).toBe(false);
  });
});
