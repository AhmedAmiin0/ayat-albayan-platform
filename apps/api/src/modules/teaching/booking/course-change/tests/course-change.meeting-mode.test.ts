import { courseChangeSchema } from '@ab/schedule';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BODY, SALES, setup } from '@/modules/teaching/booking/course-change/course-change.fakes';

// Names the fixed link unless the teacher uses our classroom (migration 490).

const templateOf = (apply: ReturnType<typeof setup>['writer']['apply']) =>
  (apply.mock.calls[0]?.[0].payload as { messages: { template_key: string }[] }).messages[0]?.template_key;

describe('CourseChange — the course teacher’s meeting mode', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('a platform teacher: the confirmation is plain; the mode is read for the course teacher', async () => {
    const { service, queries, writer } = setup();
    queries.teacherMode.mockResolvedValue('platform');
    await service.change(courseChangeSchema.parse(BODY), SALES);
    expect(queries.teacherMode).toHaveBeenCalledWith('t1');
    expect(templateOf(writer.apply)).toBe('booking_confirmation_plain');
  });

  it('a static teacher (or one following the academy, OFF here): the fixed Meet link', async () => {
    for (const mode of ['static', null] as const) {
      const { service, queries, writer } = setup();
      queries.teacherMode.mockResolvedValue(mode);
      await service.change(courseChangeSchema.parse(BODY), SALES);
      expect(templateOf(writer.apply)).toBe('booking_confirmation_meet');
    }
  });
});
