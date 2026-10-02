// «تقويم الحجوزات» vocabulary: booking status, weekdays, the «التكرار» recurrence text.
import { lookup } from './values.ts';

/** «الحالة». docs/06: schedule rules only from confirmed/subscribed. */
export const bookingStatus = lookup<
  'confirmed' | 'subscribed' | 'needs_confirmation' | 'tentative' | 'done' | 'cancelled'
>({
  مؤكد: 'confirmed',
  مشترك: 'subscribed',
  'يحتاج تأكيد': 'needs_confirmation',
  مبدئي: 'tentative',
  تمت: 'done',
  ملغي: 'cancelled',
});

/** Weekday names → byday (0 = الأحد … 6 = السبت), Arabic and HEART's English column names. */
export const weekday = lookup<number>({
  الأحد: 0,
  الاتنين: 1,
  الاثنين: 1,
  الثلاثاء: 2,
  الأربعاء: 3,
  الخميس: 4,
  الجمعة: 5,
  السبت: 6,
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
});

export interface Recurrence {
  byday: number[];
  /** Inclusive last local day («حتى 2026-10-17»), or null = open-ended. */
  until: string | null;
}

/**
 * «أسبوعي: السبت,الثلاثاء حتى 2026-10-17» → { byday: [2, 6], until }. Empty → null (one-off).
 * undefined = text present but not understood (raise unmapped_value).
 */
export function parseRecurrence(raw: string | null): Recurrence | null | undefined {
  if (!raw) return null;
  const m = /^أسبوعي\s*:\s*(.+?)(?:\s+حتى\s+(\d{4}-\d{2}-\d{2}))?$/.exec(raw.trim());
  if (!m?.[1]) return undefined;
  const days = m[1].split(/[,،]/).map((d) => weekday(d.trim()));
  if (days.length === 0 || days.some((d) => d === undefined)) return undefined;
  const byday = [...new Set(days as number[])].sort((a, b) => a - b);
  return { byday, until: m[2] ?? null };
}
