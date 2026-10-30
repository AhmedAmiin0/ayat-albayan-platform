// HTTP harness of «إلغاء الاشتراك» (test-only, excluded from the build by *.fakes.ts).
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { bootWith, ROLE_ADMIN, ROLE_SALES, ROLE_USERS } from '@/common/auth/auth.fakes';
import { notFound } from '@/common/http/errors';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { MoneyWrites } from '@/modules/finance/subscriptions';
import { LessonEvents } from '@/common/events/lesson-events';
import { CourseStopRepo, type StopSub } from './course-stop.repo';

export const STUDENT = '5a000000-0000-4000-8000-0000000000a1';
export const SUB = 'b0000000-0000-4000-8000-0000000000b1';
export const REQ = 'e0000000-0000-4000-8000-0000000000e1';
export const ADMIN = ROLE_ADMIN;
export const SALES = ROLE_SALES;
export const NOW = new Date('2026-10-30T09:00:00Z');

/** A paid, half-used package of STUDENT. */
export const subRow = (over: Partial<StopSub> = {}): StopSub => ({
  id: SUB,
  student_id: STUDENT,
  status: 'active',
  currency: 'SAR',
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: null,
  ...over,
});
export const stamped = subRow({
  status: 'cancelled',
  cancelled_at: NOW.toISOString(),
  cancelled_by: SALES,
  cancel_reason: 'سفر',
});

/** stop_course's answer to a first stop: 2 rules ended, 3 lessons cancelled, student churned. */
export const STOPPED = {
  cancelled_lessons: ['l1', 'l2', 'l3'],
  ended_rules: ['r1', 'r2'],
  student_status: 'churned',
  stopped_at: '2026-10-30T09:00:00+00:00',
  replayed: false,
};

function mocks() {
  return {
    repo: { current: vi.fn(), subscription: vi.fn(), plan: vi.fn(), paid: vi.fn(), stop: vi.fn() },
    writes: { recorded: vi.fn() },
    events: { changed: vi.fn(), onChanged: vi.fn() },
  };
}

function reset(m: ReturnType<typeof mocks>): void {
  vi.resetAllMocks();
  m.repo.subscription.mockImplementation(async (_id: string, studentId: string) => {
    if (studentId !== STUDENT) throw notFound('subscription_not_found');
    return subRow();
  });
  m.repo.plan.mockResolvedValue({
    rule_ids: ['r1', 'r2'],
    lessons: [{ id: 'l1', status: 'scheduled' }],
    unattributed: false,
  });
  m.repo.current.mockResolvedValue(subRow());
  m.repo.paid.mockResolvedValue(290);
  m.repo.stop.mockResolvedValue(STOPPED);
  m.writes.recorded.mockResolvedValue(undefined);
  m.events.changed.mockResolvedValue(undefined);
}

export async function stopApp() {
  const m = mocks();
  const builder = Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(SettingsService)
    .useValue(fakeSettings({}))
    .overrideProvider(CourseStopRepo)
    .useValue(m.repo)
    .overrideProvider(LessonEvents)
    .useValue(m.events)
    .overrideProvider(MoneyWrites)
    .useValue(m.writes);
  const app = await bootWith(builder, ROLE_USERS);
  const call = (input: { method: 'GET' | 'POST'; url: string; token: string; body?: object }) =>
    app.inject({
      method: input.method,
      url: input.url,
      payload: input.body,
      headers: { authorization: `Bearer ${input.token}` },
    });
  return { app, m, call, reset: () => reset(m) };
}
