import {
  expiryParts,
  expiryText,
  linkErrorText,
  SHORT_LINK_PURGE_DAYS,
  usageText,
  type LinkField,
  type LinkFieldErrors,
  type LinkTone,
} from '@ab/client-core';
import { weekdayDayMonth, type ClockCycle, type ShortLinkRow, type Tone } from '@ab/shared';
import { locale, t } from '@ab/mobile-kit';
import { clockIn, dateWithClock } from '@/core/lib/clock';

// The words a link's card and page share, in this run's language and the viewer's zone.

/** The chip colour of a link's state and of a WhatsApp send (its glyph is client-core's). */
export const TONE: Readonly<Record<LinkTone, Tone>> = {
  success: 'ok',
  warning: 'act',
  neutral: 'neutral',
  danger: 'bad',
};

/** «الثلاثاء 24 نوفمبر» in the viewer's zone. */
const dayText = (iso: string, tz: string): string =>
  weekdayDayMonth(new Date(iso), { tz, locale });

/** «الثلاثاء 24 نوفمبر، 9:00 ص» in the viewer's zone and clock. */
export const whenText = (iso: string, tz: string, cycle: ClockCycle): string =>
  dateWithClock(dayText(iso, tz), clockIn(new Date(iso), tz, cycle));

/** «7 من 12» / «23 · بلا حد». */
export const usageLine = (row: Pick<ShortLinkRow, 'maxUsers' | 'visitors'>): string =>
  usageText(row, t.shortLinks.list);

interface Viewer {
  now: Date;
  tz: string;
}

/** «بعد 3 أيام», «غدًا», «انتهى الثلاثاء 10 نوفمبر · يُحذف 10 ديسمبر». */
export function expiryLine(row: Pick<ShortLinkRow, 'status' | 'expiresAt'>, viewer: Viewer) {
  const parts = expiryParts(row, { ...viewer, purgeDays: SHORT_LINK_PURGE_DAYS });
  return expiryText(parts, {
    words: t.shortLinks.expiry,
    date: (iso) => dayText(iso, viewer.tz),
  });
}

/** A field's words from shortLinks.form.errors, or undefined. */
export const errorText = (errors: LinkFieldErrors, field: LinkField): string | undefined =>
  linkErrorText(errors, field, t.shortLinks.form.errors);
