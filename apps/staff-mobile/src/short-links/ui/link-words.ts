import {
  expiryParts,
  expiryText,
  SHORT_LINK_PURGE_DAYS,
  usageText,
  type LinkField,
  type LinkFieldErrors,
  type LinkTone,
} from '@ab/client-core';
import { weekdayDayMonth, type ClockCycle, type ShortLinkRow, type StatusStyle } from '@ab/shared';
import { locale, t } from '@ab/mobile-kit';
import { clockIn, dateWithClock } from '@/core/lib/clock';

// The words a link's card and page share, in this run's language and the viewer's zone.

/** The chip of a link's state and of a WhatsApp send (never colour alone: glyph + word). */
export const TONE_STYLE: Readonly<Record<LinkTone, StatusStyle>> = {
  success: { tone: 'ok', glyph: 'fill' },
  warning: { tone: 'act', glyph: 'half' },
  neutral: { tone: 'neutral', glyph: 'hollow' },
  danger: { tone: 'bad', glyph: 'struck' },
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
export const errorText = (errors: LinkFieldErrors, field: LinkField): string | undefined => {
  const key = errors[field];
  return key === undefined ? undefined : t.shortLinks.form.errors[key];
};

/** A form check as its body (absent while a field is wrong) and its errors (none if it passed). */
export function splitCheck<B>(check: { body: B } | { errors: LinkFieldErrors }): {
  body?: B;
  errors: LinkFieldErrors;
} {
  return { errors: {}, ...check };
}
