import { describe, expect, it, vi } from 'vitest';
import type { TeacherReportLink } from '@/modules/reporting/reports';
import { LegacyReportLinks } from './legacy.service';
import type { LessonLinksRepo, LinkLesson } from './lesson-links.repo';

const NOW = new Date('2026-11-06T15:00:00Z');
const L1 = '0b9f3c2e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const lesson = (over: Partial<LinkLesson> = {}): LinkLesson => ({
  id: L1,
  teacher_id: 'T-now',
  ends_at: '2026-11-06T14:30:00Z',
  status: 'completed',
  ...over,
});

function setup(rows: { lesson?: LinkLesson | null; teachers?: { id: string; tz: string }[] } = {}) {
  const repo = {
    lesson: vi.fn(async (id: string) => (rows.lesson === undefined ? lesson({ id }) : rows.lesson)),
    studentByCode: vi.fn(async (code: string) => (code === 'AB-0004' ? 'S1' : null)),
    teachersNamed: vi.fn(async () => rows.teachers ?? [{ id: 'T-old', tz: 'Asia/Riyadh' }]),
    pairLessons: vi.fn(async () => [
      { id: 'older', starts_at: '2026-11-06T10:00:00Z' },
      { id: L1, starts_at: '2026-11-06T14:00:00Z' },
    ]),
  };
  const reports = {
    forLesson: vi.fn((l: { id: string }): TeacherReportLink | null => ({
      suffix: l.id,
      url: `https://app.example/teacher/report/${l.id}`,
    })),
  };
  const service = new LegacyReportLinks(
    repo as unknown as LessonLinksRepo,
    reports,
  );
  return { service, repo, reports };
}

describe('LegacyReportLinks (GET /report-link/legacy/*)', () => {
  it('(a) teacher/report/<lessonId>: that lesson’s signed-in portal page', async () => {
    const { service, reports } = setup();
    expect(await service.target(`teacher/report/${L1}`, NOW)).toBe(
      `https://app.example/teacher/report/${L1}`,
    );
    expect(reports.forLesson).toHaveBeenCalledWith(expect.objectContaining({ id: L1 }));
  });

  it('no web origin: invalid', async () => {
    const { service, reports } = setup();
    reports.forLesson.mockReturnValueOnce(null);
    expect(await service.target(`teacher/report/${L1}`, NOW)).toBeNull();
  });

  it('(b) <code>/<teacher>/…: the pair’s most recent lesson of the last 24 h, in the teacher’s day', async () => {
    const { service, repo } = setup();
    const url = await service.target(`AB-0004/${encodeURIComponent('أبرار')}/tok`, NOW);
    expect(url).toBe(`https://app.example/teacher/report/${L1}`);
    expect(repo.teachersNamed).toHaveBeenCalledWith('أبرار');
    expect(repo.pairLessons).toHaveBeenCalledWith({
      studentId: 'S1',
      teacherId: 'T-old',
      from: new Date('2026-11-05T15:00:00Z'),
      to: new Date('2026-11-06T21:00:00Z'),
    });
  });

  it('(b) unknown student, no teacher or two of that name: invalid, nothing issued', async () => {
    const two = [
      { id: 'A', tz: 'UTC' },
      { id: 'B', tz: 'UTC' },
    ];
    for (const [path, teachers] of [
      ['AB-9999/x/t', undefined],
      ['AB-0004/x/t', []],
      ['AB-0004/x/t', two],
    ] as const) {
      const { service, reports } = setup({ teachers: teachers ? [...teachers] : undefined });
      expect(await service.target(path, NOW)).toBeNull();
      expect(reports.forLesson).not.toHaveBeenCalled();
    }
  });

  it('(c) anything else, a missing lesson or a cancelled one: invalid', async () => {
    expect(await setup().service.target('whatever/else', NOW)).toBeNull();
    expect(await setup({ lesson: null }).service.target(`teacher/report/${L1}`, NOW)).toBeNull();
    const cancelled = setup({ lesson: lesson({ status: 'cancelled_by_admin' }) });
    expect(await cancelled.service.target(`teacher/report/${L1}`, NOW)).toBeNull();
  });
});
