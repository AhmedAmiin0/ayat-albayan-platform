import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConflictChecker } from '@/modules/teaching/scheduling/conflicts/conflict-checker';
import type { TeachersRepo } from '@/modules/people/teachers/teachers.repo';
import {
  ADMIN,
  appliedChange,
  fakeStore,
  LESSON_ID,
} from '@/modules/teaching/lessons/lessons.fakes';
import { RescheduleOneService } from './reschedule-one.service';

const checker = { check: vi.fn() };
const teachers = { get: vi.fn() };
const NEW_START = '2026-10-05T17:00:00+03:00';

function setup() {
  const deps = fakeStore();
  const service = new RescheduleOneService(
    deps.store,
    teachers as unknown as TeachersRepo,
    checker as unknown as ConflictChecker,
  );
  return { ...deps, service };
}

describe('RescheduleOneService — «سبب تغيير الموعد» (docs/47)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    checker.check.mockResolvedValue([]);
  });

  it('with a reason: the old row keeps it as cancel_reason, and the audit says it', async () => {
    const { service, writer, record } = setup();
    const body = { scope: 'one' as const, startsAt: NEW_START, reason: 'سفر الأسرة' };
    await service.reschedule({ lessonId: LESSON_ID, body, actor: ADMIN });
    expect(appliedChange(writer)?.changes).toEqual([{
      id: LESSON_ID, from_status: 'scheduled', to_status: 'rescheduled', chargeable: false,
      cancel_reason: 'سفر الأسرة',
    }]);
    const audit = expect.objectContaining({ reason: 'سفر الأسرة' });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ after: audit }));
  });

  it('without one: no cancel_reason key (the old text is kept), audit reason null', async () => {
    const { service, writer, record } = setup();
    const body = { scope: 'one' as const, startsAt: NEW_START };
    await service.reschedule({ lessonId: LESSON_ID, body, actor: ADMIN });
    expect(appliedChange(writer)?.changes[0]).not.toHaveProperty('cancel_reason');
    const audit = expect.objectContaining({ reason: null });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ after: audit }));
  });
});
