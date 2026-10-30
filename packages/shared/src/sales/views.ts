import { z } from 'zod';
import type { JoinWindow } from '../schedule/classroom/join-window.js';
import type { LessonStatus, PackageSize, SubscriptionStatus } from '../enums/index.js';

/** GET /sales/subscriptions rows: who and which package, never a price, currency, fx rate or note. */
export interface SalesSubscriptionView {
  id: string;
  student: { id: string; code: string; name: string };
  package: PackageSize | null;
  status: SubscriptionStatus;
  starts_on: string;
  lessons_total: number;
}

/** GET /sales/meetings rows: a trial lesson booked from one of the salesperson's leads. */
export interface SalesMeetingView {
  lesson_id: string;
  starts_at: string;
  ends_at: string;
  status: LessonStatus;
  teacher_name: string | null;
  lead_or_student_name: string | null;
  joinable_window: JoinWindow;
}

/** GET /sales/people (admin picker): a salesperson and how many leads they are working. */
export interface SalesPersonView {
  id: string;
  name: string;
  open_leads: number;
}

export const salesSubscriptionsQuerySchema = z.object({ kind: z.enum(['pending', 'confirmed']) });

const DAY_MS = 86_400_000;
/** ISO instants, at most 31 days apart. */
export const salesMeetingsQuerySchema = z
  .object({ from: z.iso.datetime({ offset: true }), to: z.iso.datetime({ offset: true }) })
  .refine((q) => Date.parse(q.to) >= Date.parse(q.from) && Date.parse(q.to) - Date.parse(q.from) <= 31 * DAY_MS, {
    message: 'range_too_long',
    path: ['to'],
  });

/** POST /leads/:id/assign: a sales profile id, or null to unassign. */
export const leadAssignSchema = z.object({ profileId: z.uuid().nullable() });
