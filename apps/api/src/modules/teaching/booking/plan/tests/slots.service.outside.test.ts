import { HttpException } from '@nestjs/common';
import { outsideSlotsResponseSchema } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeContext, IDS } from '@/modules/teaching/booking/booking.fakes';
import type { BookingRepo } from '@/modules/teaching/booking/core/booking.repo';
import { readerOf } from '@/common/settings/settings.fakes';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';
import { SlotsService } from '@/modules/teaching/booking/plan/slots.service';

// The server clock: Tue 2026-12-01 08:07Z (Cairo UTC+2), not on the 30-min grid.
const SERVER_NOW = new Date('2026-12-01T08:07:00Z');
function setup() {
  const deps = fakeContext();
  return {
    ...deps,
    service: new SlotsService(
      deps.queries as unknown as BookingRepo,
      deps.context,
      readerOf(BookingSettings, { teachers_always_available: false }),
    ),
  };
}

describe('SlotsService.outside (GET /booking/outside-slots, server time)', () => {
  beforeEach(() => vi.useFakeTimers({ now: SERVER_NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('counts 14 days from the server now and says when that was', async () => {
    const { service, busy, availability } = setup();
    const res = await service.outside({
      teacherId: IDS.teacher,
      durationMin: 45,
      studentIds: [IDS.s1],
    });
    expect(outsideSlotsResponseSchema.parse(res)).toEqual(res);
    expect(res).toMatchObject({
      server_now: '2026-12-01T08:07:00.000Z',
      teacher_tz: 'Africa/Cairo',
      step_min: 30,
    });
    expect(res.slots[0]?.starts_at).toBe('2026-12-01T08:30:00.000Z');
    expect(res.slots.at(-1)?.ends_at).toBe('2026-12-15T07:45:00.000Z');
    const range = { from: SERVER_NOW, to: new Date('2026-12-15T08:07:00Z') };
    expect(busy.studentLessons).toHaveBeenCalledWith([IDS.s1], range);
    expect(availability.listBusyLessons).toHaveBeenCalledWith(IDS.teacher, range);
  });

  it('marks the starts inside the teacher hours (fake grid: Sun + Tue 16:00–22:00 Cairo)', async () => {
    const res = await setup().service.outside({ teacherId: IDS.teacher, durationMin: 45 });
    const inside = res.slots.filter((s) => s.inside_hours && s.starts_at.startsWith('2026-12-01'));
    expect(inside.map((s) => s.starts_at.slice(11, 16))).toEqual([
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
      '18:30',
      '19:00',
    ]);
  });

  it('keeps a given step and frees the moved lesson (excludeLessonId)', async () => {
    const { service, availability } = setup();
    const lesson = {
      id: 'L1',
      starts_at: new Date('2026-12-01T10:00:00Z'),
      ends_at: new Date('2026-12-01T10:45:00Z'),
    };
    availability.listBusyLessons.mockResolvedValue([lesson]);
    const res = await service.outside({
      teacherId: IDS.teacher,
      durationMin: 45,
      stepMin: 60,
      excludeLessonId: 'L1',
    });
    expect(res.step_min).toBe(60);
    expect(res.slots.map((s) => s.starts_at)).toContain('2026-12-01T10:00:00.000Z');
    const busy = await service.outside({ teacherId: IDS.teacher, durationMin: 45, stepMin: 60 });
    expect(busy.slots.map((s) => s.starts_at)).not.toContain('2026-12-01T10:00:00.000Z');
  });

  it('404 teacher_not_found', async () => {
    const { service, queries } = setup();
    queries.teacher.mockResolvedValue(null);
    const err = await service
      .outside({ teacherId: IDS.missing, durationMin: 45 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getStatus()).toBe(404);
  });
});
