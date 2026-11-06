import { bookingRequestSchema, type BookingRequest } from '@ab/shared';
import { vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { PackageEvents } from '@/common/infra/events/lesson-events';
import type { CourseDraftEnv } from './course-draft.env';
import type { CourseDraftRepo } from './course-draft.repo';
import type { CourseDraft } from './course-draft.rules';
import { CourseDrafts } from './course-draft.service';

// Test-only: CourseDrafts over an in-memory draft table and fake booking (owner 2026-11-06).

export const SUB = 'e0000000-0000-4000-8000-000000000001';
export const USER: AuthUser = { id: 'a1000000-0000-4000-8000-00000000000a', email: null, role: 'sales' };
export const REQ: BookingRequest = bookingRequestSchema.parse({
  kind: 'package', package: '8', studentIds: ['c0000000-0000-4000-8000-000000000001'],
  teacherId: 'd0000000-0000-4000-8000-000000000001', byday: [0, 4], startTimeLocal: '17:00',
  tz: 'Asia/Riyadh', durationMin: 45, startsOn: '2026-11-08',
});
export const BOOKING = { rule_id: 'r1', lesson_ids: ['l1'], student_ids: ['s1'] };

/** The package: `held` (unpaid, link open) answers, its status, booked or not; the drafts. */
export function setup(state: { held: boolean[]; status?: string; booked?: boolean }) {
  const rows = new Map<string, CourseDraft>();
  const held = [...state.held];
  const repo = {
    held: vi.fn(async () => held.shift() ?? false),
    status: vi.fn(async () => state.status ?? 'active'),
    get: vi.fn(async (id: string) => rows.get(id) ?? null),
    save: vi.fn(async (d: Omit<CourseDraft, 'savedAt'>) => {
      const savedAt = new Date(Date.now() + rows.size).toISOString();
      rows.set(d.subscriptionId, { ...d, savedAt });
      return savedAt;
    }),
    remove: vi.fn(async (d: Pick<CourseDraft, 'subscriptionId' | 'savedAt'>) => {
      if (rows.get(d.subscriptionId)?.savedAt === d.savedAt) rows.delete(d.subscriptionId);
    }),
  };
  const opts = { invoiceWaived: true, endsOn: '2026-12-03', course: { package: '8', subscriptionId: SUB } };
  const env = {
    sales: { allowed: vi.fn(async () => ({ own: {}, opts })), book: vi.fn(async () => BOOKING) },
    course: {
      options: vi.fn(async () => opts),
      isBooked: vi.fn(async () => state.booked ?? false),
      isReplay: vi.fn(async () => false),
    },
    booking: { book: vi.fn(async () => BOOKING) },
    due: { clash: vi.fn(async () => undefined) },
  };
  const events = new PackageEvents();
  const asRepo = repo as unknown as CourseDraftRepo;
  const drafts = new CourseDrafts(asRepo, env as unknown as CourseDraftEnv, events);
  drafts.onModuleInit();
  return { drafts, repo, env, rows, events };
}
