// Bookings vocabulary: status, weekdays, the recurrence text.
import { lookup } from './values.ts';

/** docs/06: rules and one-off lessons from confirmed, subscribed or needs confirmation. */
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

/** Weekday names to byday (0 = Sunday ... 6 = Saturday), Arabic and HEART's English names. */
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
  /** Inclusive last local day, or null when open-ended. */
  until: string | null;
}

/** Empty is null (one-off); undefined means text present but not understood (unmapped_value). */
export function parseRecurrence(raw: string | null): Recurrence | null | undefined {
  if (!raw) return null;
  // As the Apps Script's parseRepeat: the until day ends at 23:59 Asia/Riyadh.
  const m = /^أسبوعي\s*:\s*(.+?)(?:\s*حتى\s*(\d{4})-(\d{1,2})-(\d{1,2}))?$/.exec(raw.trim());
  if (!m?.[1]) return undefined;
  const days = m[1].split(/[,،]/).map((d) => weekday(d.trim()));
  if (days.length === 0 || days.some((d) => d === undefined)) return undefined;
  const byday = [...new Set(days as number[])].sort((a, b) => a - b);
  return { byday, until: untilDay(m) };
}

function untilDay(m: RegExpExecArray): string | null {
  const pad = (n: string | undefined) => (n ?? '').padStart(2, '0');
  return m[2] ? `${m[2]}-${pad(m[3])}-${pad(m[4])}` : null;
}
