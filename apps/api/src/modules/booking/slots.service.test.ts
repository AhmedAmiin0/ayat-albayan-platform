import { HttpException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { SlotsQuery } from './booking.dto';
import { fakeContext, IDS } from './booking.fakes';
import type { BookingQueries } from './booking.queries';
import { slotViews, SlotsService } from './slots.service';

// Sun 2026-10-04, Cairo UTC+3: the 16:00–22:00 grid is 13:00–19:00Z.
const query = (over: Partial<SlotsQuery> = {}): SlotsQuery => ({
  teacherId: IDS.teacher,
  from: '2026-10-04T00:00:00Z',
  to: '2026-10-05T00:00:00Z',
  durationMin: 60,
  ...over,
});
function setup() {
  const deps = fakeContext();
  return { ...deps, service: new SlotsService(deps.queries as unknown as BookingQueries, deps.context) };
}

describe('SlotsService (R-SCH-06, R-SCH-04, docs/10 §5 #13)', () => {
  it('offers every start of the grid, stepped by the duration by default', async () => {
    const { service } = setup();
    const res = await service.slots(query());
    expect(res.teacher_tz).toBe('Africa/Cairo');
    expect(res.step_min).toBe(60);
    expect(res.slots.map((s) => s.starts_at.slice(11, 16))).toEqual(['13:00', '14:00', '15:00', '16:00', '17:00', '18:00']);
    expect(res.slots.every((s) => s.conflicts.length === 0)).toBe(true);
  });

  it('keeps blocked starts and says why (teacher lesson, student lesson, time-off)', async () => {
    const { service, availability, busy } = setup();
    availability.listBusyLessons.mockResolvedValue([
      { id: 'T1', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') },
    ]);
    busy.studentLessons.mockResolvedValue([
      { id: 'S1L', student_id: IDS.s1, starts_at: new Date('2026-10-04T16:30:00Z'), ends_at: new Date('2026-10-04T17:15:00Z') },
    ]);
    availability.listTimeOff.mockResolvedValue([
      { starts_at: '2026-10-04T18:00:00Z', ends_at: '2026-10-04T20:00:00Z' },
    ]);
    const res = await service.slots(query({ studentIds: [IDS.s1] }));
    const reasons = Object.fromEntries(res.slots.map((s) => [s.starts_at.slice(11, 16), s.conflicts.map((c) => c.kind)]));
    expect(reasons).toEqual({
      '13:00': [],
      '14:00': ['teacher_busy'],
      '15:00': [],
      '16:00': ['student_busy'],
      '17:00': ['student_busy'],
      '18:00': ['time_off'],
    });
    expect(busy.studentLessons).toHaveBeenCalledWith([IDS.s1], {
      from: new Date('2026-10-04T00:00:00Z'),
      to: new Date('2026-10-05T00:00:00Z'),
    });
  });

  it('honours a finer grid step', async () => {
    const { service } = setup();
    const res = await service.slots(query({ durationMin: 45, stepMin: 30 }));
    expect(res.step_min).toBe(30);
    expect(res.slots[1]?.starts_at).toBe('2026-10-04T13:30:00.000Z');
    expect(res.slots.at(-1)?.ends_at).toBe('2026-10-04T18:45:00.000Z');
  });

  it('excludeLessonId (R-SCH-11): the lesson being edited is not busy against itself, teacher or student side', async () => {
    const { service, availability, busy } = setup();
    availability.listBusyLessons.mockResolvedValue([
      { id: 'EDITED', starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') },
    ]);
    busy.studentLessons.mockResolvedValue([
      { id: 'EDITED', student_id: IDS.s1, starts_at: new Date('2026-10-04T14:00:00Z'), ends_at: new Date('2026-10-04T14:45:00Z') },
      { id: 'OTHER', student_id: IDS.s1, starts_at: new Date('2026-10-04T16:00:00Z'), ends_at: new Date('2026-10-04T16:45:00Z') },
    ]);
    const kinds = async (over: Partial<SlotsQuery>) =>
      (await service.slots(query({ studentIds: [IDS.s1], durationMin: 45, stepMin: 60, ...over }))).slots
        .filter((x) => x.conflicts.length > 0)
        .map((x) => x.starts_at.slice(11, 16));
    expect(await kinds({})).toEqual(['14:00', '16:00']);
    expect(await kinds({ excludeLessonId: 'EDITED' })).toEqual(['16:00']);
  });

  it('400 range_too_large past 14 days, 404 for an unknown teacher', async () => {
    const { service, queries } = setup();
    const wide = await service.slots(query({ to: '2026-10-19T00:00:01Z' })).catch((e: unknown) => e);
    expect(wide instanceof HttpException && [wide.getStatus(), wide.getResponse()]).toEqual([
      400,
      { code: 'range_too_large', message: 'range_too_large', maxDays: 14 },
    ]);
    queries.teacher.mockResolvedValue(null);
    const missing = await service.slots(query()).catch((e: unknown) => e);
    expect(missing instanceof HttpException && missing.getStatus()).toBe(404);
  });
});

describe('slotViews', () => {
  it('pairs each candidate with the conflicts at its start', () => {
    const at = { starts_at: new Date('2026-10-04T13:00:00Z'), ends_at: new Date('2026-10-04T14:00:00Z') };
    const c = { kind: 'time_off' as const, startsAt: '2026-10-04T13:00:00.000Z', endsAt: '2026-10-04T14:00:00.000Z' };
    expect(slotViews([at], [c, c])).toEqual([
      { starts_at: '2026-10-04T13:00:00.000Z', ends_at: '2026-10-04T14:00:00.000Z', conflicts: [c, c] },
    ]);
  });
});
