import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { fakeQueries, IDS, STUDENTS } from './booking.fakes';
import type { BookingQueries } from './booking.queries';
import type { TeachersQueries } from '../teachers/teachers.queries';
import type { TeacherOptionsQueries } from './teacher-options.queries';
import { TeacherOptionsService } from './teacher-options.service';

const ABRAR = {
  id: IDS.teacher,
  display_name_ar: 'أبرار',
  gender: 'female' as const,
  programs: ['quran' as const],
  tz: 'Africa/Cairo',
  meeting_link: null,
  meeting_mode: null as string | null,
  max_students: 12,
};
function setup() {
  const options = {
    active: vi.fn().mockResolvedValue([ABRAR]),
    withAvailability: vi.fn().mockResolvedValue(new Set([IDS.teacher])),
    academyAuto: vi.fn().mockResolvedValue(false),
  };
  const teachers = { loads: vi.fn().mockResolvedValue(new Map([[IDS.teacher, 7]])) };
  const queries = fakeQueries();
  const service = new TeacherOptionsService(
    options as unknown as TeacherOptionsQueries,
    queries as unknown as BookingQueries,
    teachers as unknown as TeachersQueries,
  );
  return { options, queries, service, teachers };
}

describe('TeacherOptionsService (R-SCH-06, docs/10 §5 #12)', () => {
  it("filters by the student's program and teacher_gender_pref", async () => {
    const { service, options } = setup();
    await service.list({ studentId: IDS.s1 });
    expect(options.active).toHaveBeenCalledWith({ program: 'quran', gender: 'female' });
  });

  it("an explicit gender beats the student's preference", async () => {
    const { service, options } = setup();
    await service.list({ studentId: IDS.s1, gender: 'male' });
    expect(options.active).toHaveBeenCalledWith({ program: 'quran', gender: 'male' });
  });

  it('a student without a preference sees every gender', async () => {
    const { service, options, queries } = setup();
    queries.students.mockResolvedValue(
      STUDENTS.map((s) => ({ ...s, program: 'arabic' as const, teacher_gender_pref: null })),
    );
    await service.list({ studentId: IDS.s1 });
    expect(options.active).toHaveBeenCalledWith({ program: 'arabic', gender: undefined });
  });

  it('by program alone (new student from a lead)', async () => {
    const { service, options, queries } = setup();
    await service.list({ program: 'islamic_studies' });
    expect(options.active).toHaveBeenCalledWith({ program: 'islamic_studies', gender: undefined });
    expect(queries.students).not.toHaveBeenCalled();
  });

  it('returns the load (students vs max) and whether the teacher has a grid', async () => {
    const { service } = setup();
    const option = { id: ABRAR.id, display_name_ar: 'أبرار', gender: 'female', programs: ['quran'], tz: 'Africa/Cairo', meeting_link: null, max_students: 12 };
    expect(await service.list({ program: 'quran' })).toEqual([
      { ...option, platform_classroom: false, students_count: 7, has_availability: true },
    ]);
  });

  it('platform_classroom: the teacher\'s meeting_mode, else the academy default (migration 490)', async () => {
    const { service, options } = setup();
    options.academyAuto.mockResolvedValue(true);
    options.active.mockResolvedValue([ABRAR, { ...ABRAR, id: 'static', meeting_mode: 'static' }]);
    expect((await service.list({ program: 'quran' })).map((t) => t.platform_classroom)).toEqual([true, false]);
    options.academyAuto.mockResolvedValue(false);
    options.active.mockResolvedValue([{ ...ABRAR, meeting_mode: 'platform' }]);
    expect((await service.list({ program: 'quran' }))[0]).toMatchObject({ platform_classroom: true });
    expect((await service.list({ program: 'quran' }))[0]).not.toHaveProperty('meeting_mode');
  });

  it('a teacher with no students and no grid shows 0 and disabled', async () => {
    const { service, options, teachers } = setup();
    teachers.loads.mockResolvedValue(new Map());
    options.withAvailability.mockResolvedValue(new Set());
    const [only] = await service.list({ program: 'quran' });
    expect(only).toMatchObject({ students_count: 0, has_availability: false });
  });

  it('no matching teacher → [] without the load queries', async () => {
    const { service, options, teachers } = setup();
    options.active.mockResolvedValue([]);
    expect(await service.list({ program: 'quran' })).toEqual([]);
    expect(teachers.loads).not.toHaveBeenCalled();
  });

  it('404 student_not_found', async () => {
    const { service } = setup();
    const err = await service.list({ studentId: IDS.missing }).catch((e: unknown) => e);
    expect(err instanceof HttpException && [err.getStatus(), err.getResponse()]).toEqual([
      404,
      { code: 'student_not_found', message: 'student_not_found' },
    ]);
  });
});
