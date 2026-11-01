import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RecordingViews } from '@/modules/teaching/classroom/recordings/recording-list.service';
import { StudentRecordingAccess } from './student-recordings.access';
import { StudentRecordingsService } from './student-recordings.service';
import type { StudentRecordingQueries } from './student-recordings.queries';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import { ADMIN, ASSISTANT, GUARDIAN, joinRow, SIBLING, STUDENT, studentQueries, teachersFake, TEACHER, TEACHER_ID } from './student-recordings.fakes';

let q: ReturnType<typeof studentQueries>;
const views = { urlOf: vi.fn() };
const query = { page: 1, pageSize: 10 };
const service = () =>
  new StudentRecordingsService(
    new StudentRecordingAccess(q as unknown as StudentRecordingQueries, teachersFake() as unknown as TeachersRepo),
    q as unknown as StudentRecordingQueries,
    views as unknown as RecordingViews,
  );

beforeEach(() => {
  q = studentQueries();
  views.urlOf.mockReset().mockResolvedValue('https://signed.example.test/r.mp4?token=1h');
});

describe('GET /students/:id/recordings', () => {
  it('maps a row to the view: lesson, teacher, duration, size, no storage path, signed link', async () => {
    const page = await service().list({ user: ADMIN, studentId: STUDENT, query });
    expect(page).toEqual({
      items: [
        {
          id: joinRow().id,
          lesson_id: joinRow().lesson_id,
          lesson_starts_at: '2026-10-05T16:00:00.000Z',
          started_at: '2026-10-05T16:00:00.000Z',
          teacher: { id: TEACHER_ID, display_name_ar: 'أ. منى', display_name_en: 'Ms. Mona' },
          status: 'done',
          duration_seconds: 3600,
          size_bytes: 52_428_800,
          media: 'video',
          visible_to_student: false,
          can_manage: true,
          url: 'https://signed.example.test/r.mp4?token=1h',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    });
    expect(JSON.stringify(page)).not.toContain('file_path');
    expect(JSON.stringify(page)).not.toContain('lessons/');
  });

  it('signs only finished files, with the one-hour lifetime of RecordingViews', async () => {
    q.page.mockResolvedValue({
      rows: [joinRow({ status: 'recording', ended_at: null }), joinRow({ status: 'failed' }), joinRow({ status: 'deleted', deleted_at: '2026-10-06T00:00:00.000Z' }), joinRow()],
      total: 4,
    });
    const { items } = await service().list({ user: ADMIN, studentId: STUDENT, query });
    expect(items.map((i) => [i.status, i.url !== null])).toEqual([['recording', false], ['failed', false], ['deleted', false], ['done', true]]);
    expect(items[0]?.duration_seconds).toBeNull();
    expect(views.urlOf).toHaveBeenCalledTimes(1);
  });

  it('passes the teacher scope, the filters and the page to the query', async () => {
    q.student.mockResolvedValue({ id: STUDENT, teacher_id: 'someone-else' });
    q.taughtBy.mockResolvedValue(true);
    const filtered = { page: 2, pageSize: 5, from: '2026-10-01', teacherId: 'x' };
    await service().list({ user: TEACHER, studentId: STUDENT, query: filtered });
    expect(q.page).toHaveBeenCalledWith({ studentId: STUDENT, onlyTeacherId: TEACHER_ID, query: filtered });
  });

  it('an assistant of the student lists; the access refusal stops before any recording query', async () => {
    q.assists.mockResolvedValue(true);
    await service().list({ user: ASSISTANT, studentId: STUDENT, query });
    q.assists.mockResolvedValue(false);
    q.page.mockClear();
    await expect(service().list({ user: ASSISTANT, studentId: STUDENT, query })).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.page).not.toHaveBeenCalled();
  });
});

describe('can_manage: who may toggle visibility', () => {
  it('an admin on every row; a teacher only on the lessons they taught; an assistant on none', async () => {
    q.page.mockResolvedValue({ rows: [joinRow(), joinRow({}, 'teacher-9')], total: 2 });
    const flags = async (user: typeof ADMIN) => (await service().list({ user, studentId: STUDENT, query })).items.map((i) => i.can_manage);
    expect(await flags(ADMIN)).toEqual([true, true]);
    expect(await flags(TEACHER)).toEqual([true, false]);
    q.assists.mockResolvedValue(true);
    expect(await flags(ASSISTANT)).toEqual([false, false]);
  });
});

describe('group lessons: the same recording is in EACH attending student’s file', () => {
  it('two students of one lesson both list the one recording (same id, same lesson)', async () => {
    const shared = joinRow();
    q.page.mockResolvedValue({ rows: [shared], total: 1 });
    q.student.mockImplementation(async (id: string) => ({ id, teacher_id: TEACHER_ID }));
    const a = await service().list({ user: TEACHER, studentId: STUDENT, query });
    const b = await service().list({ user: TEACHER, studentId: SIBLING, query });
    expect(a.items[0]?.id).toBe(b.items[0]?.id);
    expect(a.items[0]?.lesson_id).toBe(b.items[0]?.lesson_id);
    expect(q.page.mock.calls.map(([i]) => (i as { studentId: string }).studentId)).toEqual([STUDENT, SIBLING]);
  });
});

describe('GET /students/:id/recorded-lesson-ids', () => {
  it('returns the ids without signing a single link, under the same access rules', async () => {
    expect(await service().recordedLessonIds({ user: TEACHER, studentId: STUDENT })).toEqual(['les-1']);
    expect(q.doneLessonIds).toHaveBeenCalledWith({ studentId: STUDENT, onlyTeacherId: null });
    expect(views.urlOf).not.toHaveBeenCalled();
    q.doneLessonIds.mockClear();
    await expect(service().recordedLessonIds({ user: GUARDIAN, studentId: STUDENT })).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.doneLessonIds).not.toHaveBeenCalled();
  });
});

describe('a guardian has no recordings route', () => {
  it('is refused before any recording query (the portal will add its own)', async () => {
    await expect(service().list({ user: GUARDIAN, studentId: STUDENT, query })).rejects.toBeInstanceOf(ForbiddenException);
    expect(q.page).not.toHaveBeenCalled();
  });
});
