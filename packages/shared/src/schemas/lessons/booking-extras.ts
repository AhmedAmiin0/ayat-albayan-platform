import type { Enums } from '@ab/db';
import { z } from 'zod';
import type { LessonStatus } from '../../enums/index.js';
import { SCHEDULING_SETTINGS } from '../../settings/domains/scheduling.js';

// Booking kind, invoice and makeup (R-SCH-10, R-PAY-03, R-MSG-06). Kept apart from scheduling.ts
// (file size); scheduling.ts adds `bookingExtras` to the booking body and refines it.

/** trial = حلقة تجريبية, package = اشتراك, makeup = حجز تعويضي (a replacement for a missed lesson). */
export const BOOKING_KINDS = ['trial', 'package', 'makeup'] as const satisfies readonly Enums<'booking_kind'>[];
export type BookingKind = (typeof BOOKING_KINDS)[number];

/**
 * Same files as receipts (RECEIPT_MIMES / RECEIPT_MAX_BYTES, migration 170 buckets): images and PDF,
 * 10 MB: the buckets' hard ceiling. The academy's own limit is settings.upload_max_mb (≤ 10),
 * checked by the API. Spelled out here because money/schemas imports scheduling, which imports this file.
 */
export const INVOICE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'] as const;
export const INVOICE_MAX_BYTES = 10 * 1024 * 1024;

/**
 * The invoice (فاتورة) of a non-trial booking: a file the client already uploaded to the signed
 * URL of POST /booking/invoice-upload-url, or a WhatsApp image/PDF the server copies itself.
 */
export const invoiceInputSchema = z.discriminatedUnion('source', [
  z.object({ source: z.literal('upload'), path: z.string().min(1) }),
  z.object({ source: z.literal('whatsapp'), messageId: z.uuid() }),
]);

/** POST /booking/invoice-upload-url. */
export const invoiceUploadSchema = z.object({
  clientRequestId: z.uuid(),
  mime: z.enum(INVOICE_MIMES, { message: 'invoice_type' }),
  size: z.int().min(1).max(INVOICE_MAX_BYTES, { message: 'invoice_too_large' }),
});

/** The shape spread into the booking body (`bookingBase.extend(bookingExtras)`). */
export const bookingExtras = {
  /** Omitted = derived from `package` (trial → trial, anything else → package). */
  kind: z.enum(BOOKING_KINDS).optional(),
  /** Required unless the kind is trial; checked at POST /booking, not by /booking/check. */
  invoice: invoiceInputSchema.optional(),
  /** The missed lesson a makeup replaces. */
  makeupOfLessonId: z.uuid().optional(),
};

export type InvoiceInput = z.infer<typeof invoiceInputSchema>;
export type InvoiceUpload = z.infer<typeof invoiceUploadSchema>;

export function bookingKindOf(req: { kind?: BookingKind | undefined; package?: string | undefined }): BookingKind {
  return req.kind ?? (req.package === 'trial' ? 'trial' : 'package');
}

/** A trial or a makeup is one lesson on one day; only a package repeats weekly. */
export const isSingleLesson = (kind: BookingKind): boolean => kind !== 'package';

export interface MakeupOriginal {
  status: LessonStatus;
  /** lesson_students.chargeable of the student being made up for. */
  chargeable: boolean;
  /** Its rule is a trial. */
  trial: boolean;
  /** It is itself a makeup. */
  makeup: boolean;
  /** ISO instant. */
  startsAt: string;
}
export type MakeupVerdict = 'ok' | 'status' | 'not_charged' | 'trial' | 'too_old' | 'is_makeup';

const DAY_MS = 86_400_000;

/**
 * May this lesson be made up? Only a student's own miss that the package already charged
 * (no_show, or an excuse that counted as a late cancel) within `windowDays` (settings.makeup_window_days). A cancel by the teacher or
 * admin and a `rescheduled` lesson are never charged, so «غيّر الميعاد» covers them; a free
 * makeup there would be an extra free lesson. A trial and a makeup are not made up again.
 */
export function makeupEligible(
  original: MakeupOriginal,
  now: Date,
  windowDays: number = SCHEDULING_SETTINGS.makeup_window_days.default,
): MakeupVerdict {
  if (original.makeup) return 'is_makeup';
  if (original.trial) return 'trial';
  if (original.status !== 'no_show' && original.status !== 'excused') return 'status';
  if (!original.chargeable) return 'not_charged';
  return Date.parse(original.startsAt) >= now.getTime() - windowDays * DAY_MS ? 'ok' : 'too_old';
}

type KindFacts = {
  kind?: BookingKind | undefined;
  package?: string | undefined;
  studentIds?: string[] | undefined;
  leadId?: string | undefined;
  newStudent?: unknown;
  makeupOfLessonId?: string | undefined;
};

/** A makeup: one existing student (no lead, no new student) and the missed lesson it replaces. */
function makeupProblems(req: KindFacts): string[] {
  const out: string[] = [];
  if (req.makeupOfLessonId === undefined) out.push('makeupOfLessonId:makeup_lesson_required');
  const single = req.studentIds?.length === 1 && req.leadId === undefined && req.newStudent === undefined;
  if (!single) out.push('studentIds:makeup_one_student');
  return out;
}

/** Which of kind / package / students / makeup link fit together (R-SCH-10). */
export function refineBookingKind(req: KindFacts, ctx: z.RefinementCtx): void {
  const kind = bookingKindOf(req);
  const found: string[] = [];
  if (kind === 'trial' && req.package !== 'trial') found.push('package:trial_package');
  if (kind === 'package' && (req.package === undefined || req.package === 'trial')) found.push('package:package_size');
  if (kind === 'makeup') found.push(...makeupProblems(req));
  else if (req.makeupOfLessonId !== undefined) found.push('makeupOfLessonId:makeup_only');
  for (const f of found) {
    const [path = '', message = ''] = f.split(':');
    ctx.addIssue({ code: 'custom', path: [path], message });
  }
}
