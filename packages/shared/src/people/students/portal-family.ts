import { PACKAGE_SIZES, PAYMENT_KINDS, SUBSCRIPTION_STATUSES } from '@ab/catalog';
import { z } from 'zod';
import { portalTeacherSchema } from './portal';

// docs/50 §5: the family app's past lessons and the package with its money. A child student never
// reads the package (403 package_guardian_only); the chat answers 403 family_chat_off while
// settings.family_chat_enabled is off.

/** GET …/package of a child's own login (403): money and the package are the guardian's. */
export const PACKAGE_GUARDIAN_ONLY = 'package_guardian_only';
/** Every family channel route while settings.family_chat_enabled is off (403). */
export const FAMILY_CHAT_OFF = 'family_chat_off';

export const PORTAL_HISTORY_STATUSES = ['attended', 'absent'] as const;
export type PortalHistoryStatus = (typeof PORTAL_HISTORY_STATUSES)[number];
/** An excused absence still counts as absent. */
export const PORTAL_OUTCOMES = ['attended', 'absent', 'excused'] as const;
export type PortalOutcome = (typeof PORTAL_OUTCOMES)[number];
/** Rows per page of the history. */
export const PORTAL_HISTORY_PAGE = 20;

/** GET …/history?status=&cursor= (cursor: the last row's starts_at, ISO). */
export const portalHistoryQuerySchema = z.object({
  status: z.enum(PORTAL_HISTORY_STATUSES),
  cursor: z.iso.datetime({ offset: true }).optional(),
});
export type PortalHistoryQuery = z.infer<typeof portalHistoryQuerySchema>;

export const portalHistoryRowSchema = z.object({
  lesson_id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  teacher: portalTeacherSchema,
  outcome: z.enum(PORTAL_OUTCOMES),
  /** The family's own excuse when one was recorded; never an internal note. */
  absence_reason: z.string().nullable(),
  /** The SENT report of this lesson, else null. */
  report_id: z.string().nullable(),
  /** A recording staff made visible to the student, else null. */
  recording_id: z.string().nullable(),
});
export type PortalHistoryRow = z.infer<typeof portalHistoryRowSchema>;

/** Newest first; next_cursor null on the last page. */
export const portalHistorySchema = z.object({
  rows: z.array(portalHistoryRowSchema),
  next_cursor: z.string().nullable(),
});
export type PortalHistory = z.infer<typeof portalHistorySchema>;

export const portalAmountSchema = z.object({ amount: z.number(), currency: z.string() });
export type PortalAmount = z.infer<typeof portalAmountSchema>;

/** The current package (the newest) with the lesson counts over every live package. */
export const portalPackageSchema = z.object({
  package: z.enum(PACKAGE_SIZES).nullable(),
  duration: z.number(),
  lessons_total: z.number(),
  /** Lessons taken over every live package; absent from an older API. */
  lessons_used: z.number().optional(),
  remaining: z.number(),
  starts_on: z.string(),
  renews_on: z.string().nullable(),
  status: z.enum(SUBSCRIPTION_STATUSES),
  /** Still owed (FamilyBalanceView); null when nothing is known. Absent from an older API. */
  amount_due: portalAmountSchema.nullable().optional(),
});
export type PortalPackage = z.infer<typeof portalPackageSchema>;

/** One payment (a refund counts against what was paid). */
export const portalPaymentSchema = z.object({
  paid_at: z.string(),
  amount: z.number(),
  currency: z.string(),
  kind: z.enum(PAYMENT_KINDS),
});
export type PortalPayment = z.infer<typeof portalPaymentSchema>;

/** GET /portal/students/:id/package (a guardian or an adult student only). */
export const portalPackageViewSchema = z.object({
  package: portalPackageSchema.nullable(),
  /** Newest first; [] from an older API. */
  payments: z.array(portalPaymentSchema).default([]),
  /** settings.family_payment_instructions: the transfer text; '' = shows nothing. */
  payment_instructions: z.string().default(''),
});
export type PortalPackageView = z.infer<typeof portalPackageViewSchema>;
