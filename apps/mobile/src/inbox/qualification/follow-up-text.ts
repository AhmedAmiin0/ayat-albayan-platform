import { FOLLOW_UP_STATUSES, lessonWhenText } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { locale } from '@/core/lib/i18n/locale';
import type { LeadProfile } from './queries';

const statuses: readonly string[] = FOLLOW_UP_STATUSES;
const f = t.followUps;
const NOTES = { queued: f.queued, waiting_template: f.waitingTemplate, no_slots: f.noSlots } as const;

/**
 * What the follow-up automation will do next (R-LEAD-05), like the web's followUpText: who paused
 * it, or why the due one has not gone out (queue, Meta's approval, no free slots), else when it is
 * due («المتابعة الجاية الأحد 4 أكتوبر 17:00», in `tz`: the device's), then «اتبعت 1 من 3».
 */
export function followUpLines(lead: LeadProfile, total: number | undefined, tz: string): string[] {
  if (lead.follow_up_paused) return [lead.follow_up_paused_by === 'lead' ? f.pausedByLead : f.paused];
  if (!statuses.includes(lead.status)) return [f.none];
  const next = lead.next_follow_up_at;
  const lines = [
    lead.follow_up_note
      ? NOTES[lead.follow_up_note]
      : next
        ? f.next.replace('{time}', lessonWhenText(new Date(next), tz, locale))
        : f.none,
  ];
  const stage = lead.follow_up_stage ?? 0;
  if (stage > 0 && total) {
    lines.push(f.stage.replace('{n}', String(stage)).replace('{total}', String(total)));
  }
  return lines;
}
