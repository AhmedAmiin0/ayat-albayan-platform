import type { Json } from '@ab/db';
import ar from '@ab/shared/i18n/ar.json';
import { followUpSlotsMessage, leadQualificationSchema, RIYADH_TZ, type FollowUpLead } from '@ab/shared';
import { queuedRow, type QueuedMessage } from '../reminders/queued-row';
import { localDay } from '../teachers/availability/zoned-time';

// R-LEAD-05 follow-up planning (docs/12 §7). Pure.

/** One `leads` row as the follow-up job reads it. */
export interface FollowUpLeadRow extends FollowUpLead {
  id: string;
  phone_e164: string;
  tz: string | null;
  qualification: Json;
  next_follow_up_at: string | null;
}

export interface LeadZone {
  tz: string;
  /** ar.json tz.<id>: {{3}} in «المواعيد بتوقيت {{3}}». */
  city: string;
}

const CITIES: Readonly<Record<string, string>> = ar.tz;
const qualificationTz = leadQualificationSchema.pick({ tz: true });

/**
 * The lead's tz: what the admin captured in the thread (qualification.tz), else leads.tz, else
 * Riyadh. A tz with no Arabic city in ar.json falls back to Riyadh too, so the message never
 * shows a raw «Europe/Paris»: Riyadh times with «الرياض» are still exact.
 */
export function leadZone(lead: Pick<FollowUpLeadRow, 'tz' | 'qualification'>): LeadZone {
  const parsed = qualificationTz.safeParse(lead.qualification);
  const tz = (parsed.success ? parsed.data.tz : null) ?? lead.tz ?? RIYADH_TZ;
  const city = CITIES[tz];
  return city ? { tz, city } : { tz: RIYADH_TZ, city: CITIES[RIYADH_TZ] ?? RIYADH_TZ };
}

/**
 * Two proposals from the free starts: the earliest, then the earliest on another local day in
 * the lead's tz (two choices half an hour apart read badly), else simply the next one.
 * null when there are fewer than two distinct starts.
 */
export function pickTwoSlots(starts: readonly Date[], tz: string): [Date, Date] | null {
  const times = [...new Set(starts.map((d) => d.getTime()))].sort((a, b) => a - b);
  const [first, next] = times;
  if (first === undefined || next === undefined) return null;
  const day = localDay(first, tz);
  const second = times.find((t) => localDay(t, tz) !== day) ?? next;
  return [new Date(first), new Date(second)];
}

export function followUpDedupKey(leadId: string, stage: number): string {
  return `follow_up_slots:${leadId}:${stage}`;
}

export interface FollowUpRowInput {
  lead: FollowUpLeadRow;
  slots: [Date, Date];
  zone: LeadZone;
  now: Date;
}

/** The queued follow_up_slots row for the lead's current stage; it expires at the first slot. */
export function followUpRow(input: FollowUpRowInput): QueuedMessage {
  const { lead, slots, zone } = input;
  return queuedRow({
    phone: lead.phone_e164,
    leadId: lead.id,
    template: followUpSlotsMessage({ slots, tz: zone.tz, tzCity: zone.city, leadId: lead.id }),
    dedupKey: followUpDedupKey(lead.id, lead.follow_up_stage),
    now: input.now,
    expiresAt: slots[0],
  });
}

/** leads.next_follow_up_at already holds `at` (both null, or the same instant). */
export function sameInstant(stored: string | null, at: Date | null): boolean {
  if (stored === null || at === null) return stored === at;
  return Date.parse(stored) === at.getTime();
}
