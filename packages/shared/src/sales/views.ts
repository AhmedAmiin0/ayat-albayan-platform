import { LESSON_STATUSES, PACKAGE_SIZES, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { joinWindowViewSchema } from '@ab/schedule';
import { z } from 'zod';

/** A row of GET /sales/subscriptions: who and which package, never a price, fx rate or note. */
export const salesSubscriptionViewSchema = z.object({
  id: z.string(),
  student: z.object({ id: z.string(), code: z.string(), name: z.string() }),
  package: z.enum(PACKAGE_SIZES).nullable(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  starts_on: z.string(),
  lessons_total: z.int().nonnegative(),
});
export type SalesSubscriptionView = z.infer<typeof salesSubscriptionViewSchema>;

/** A row of GET /sales/meetings: a trial lesson booked from one of the salesperson's leads. */
export const salesMeetingViewSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.enum(LESSON_STATUSES),
  teacher_name: z.string().nullable(),
  lead_or_student_name: z.string().nullable(),
  joinable_window: joinWindowViewSchema,
});
export type SalesMeetingView = z.infer<typeof salesMeetingViewSchema>;

export const SALES_SUBSCRIPTION_KINDS = ['pending', 'confirmed'] as const;
export const salesSubscriptionKindSchema = z.enum(SALES_SUBSCRIPTION_KINDS);
export type SalesSubscriptionKind = z.infer<typeof salesSubscriptionKindSchema>;

export const salesSubscriptionsQuerySchema = z.object({ kind: salesSubscriptionKindSchema });

const DAY_MS = 86_400_000;
const instant = z.iso.datetime({ offset: true });
const spanOf = (q: { from: string; to: string }) => Date.parse(q.to) - Date.parse(q.from);

/** ISO instants, at most 31 days apart. */
export const salesMeetingsQuerySchema = z
  .object({ from: instant, to: instant })
  .refine((q) => spanOf(q) >= 0 && spanOf(q) <= 31 * DAY_MS, {
    message: 'range_too_long',
    path: ['to'],
  });

/** POST /leads/:id/assign: a sales profile id, or null to unassign. */
export const leadAssignSchema = z.object({ profileId: z.uuid().nullable() });
