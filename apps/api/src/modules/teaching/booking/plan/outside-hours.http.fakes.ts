// Test-only.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import {
  PERMISSION_RESOLVER,
  systemResolver,
  TOKEN_VERIFIER,
  type TokenVerifier,
} from '@/common/auth/auth.guard';
import type { AuthUser } from '@/common/auth/verify-token';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { SalesRepo } from '@/modules/sales/sales/shared';
import { BookingService } from '@/modules/teaching/booking/core/booking.service';
import { SlotsService } from './slots.service';

export const TEACHER = 'a0000000-0000-4000-8000-000000000001';
export const S1 = 'c0000000-0000-4000-8000-000000000001';
export const S2 = 'c0000000-0000-4000-8000-000000000002';
const user = (role: AuthUser['role'], id: string): AuthUser => ({ id, email: null, role });
const USERS = new Map<string, AuthUser>([
  ['sales', user('sales', 'a1000000-0000-4000-8000-00000000000a')],
  ['admin', user('admin', 'ad000000-0000-4000-8000-0000000000ad')],
  ['teacher', user('teacher', 'e1000000-0000-4000-8000-0000000000e1')],
  ['guardian', user('guardian', 'a2000000-0000-4000-8000-0000000000a2')],
]);
/** A token is the user's key; anything else is refused. */
const verify: TokenVerifier = (token) =>
  USERS.has(token)
    ? Promise.resolve(USERS.get(token) as AuthUser)
    : Promise.reject(new Error('bad token'));
/** Sat 2026-12-05 12:00 Riyadh, her own student S1. */
export const TRIAL = {
  teacherId: TEACHER,
  byday: [6],
  startTimeLocal: '12:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-12-05',
  package: 'trial',
  studentIds: [S1],
  startsAt: '2026-12-05T09:00:00Z',
};
export const LIST = {
  server_now: '2026-12-01T08:00:00.000Z',
  teacher_tz: 'Africa/Cairo',
  step_min: 30,
  slots: [],
};
const BOOKED = {
  rule_id: 'r1',
  student_ids: [S1],
  guardian_ids: [],
  lessons: [],
  message_ids: [],
  invoice_id: null,
};

interface Call {
  method?: 'GET' | 'POST';
  url: string;
  token: string;
  body?: object;
}

/** The app, its fakes, a `call` and `reset` for beforeEach. */
export async function outsideApp() {
  const outside = { slots: vi.fn(), outside: vi.fn() };
  const booking = { book: vi.fn(), check: vi.fn() };
  const sales = { ownership: vi.fn() };
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER)
    .useValue(systemResolver)
    .overrideProvider(TOKEN_VERIFIER)
    .useValue(verify)
    .overrideProvider(SalesRepo)
    .useValue(sales)
    .overrideProvider(SettingsService)
    .useValue(fakeSettings({ sales_require_assignee: true }))
    .overrideProvider(BookingService)
    .useValue(booking)
    .overrideProvider(SlotsService)
    .useValue(outside)
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (o: Call) =>
    app.inject({
      method: o.method ?? 'GET',
      url: o.url,
      payload: o.body,
      headers: { authorization: `Bearer ${o.token}` },
    });
  const reset = () => {
    vi.resetAllMocks();
    sales.ownership.mockResolvedValue({
      leadIds: [],
      guardianIds: [],
      studentIds: [S1],
      phones: [],
    });
    outside.outside.mockResolvedValue(LIST);
    booking.book.mockResolvedValue(BOOKED);
  };
  return { app, call, reset, outside, booking };
}
