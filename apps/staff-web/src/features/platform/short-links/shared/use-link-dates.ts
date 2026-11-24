import { expiryParts, expiryText, SHORT_LINK_PURGE_DAYS, type ExpiryParts } from '@ab/client-core';
import type { ShortLinkRow } from '@ab/shared';
import { clockOf, dateText } from '@ab/time';
import { useClock } from '@ab/web-kit/lib/clock';
import { dateAndClock } from '@ab/web-kit/lib/clock-text';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { useNow } from '@ab/web-kit/lib/time/use-now';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';

// Dates in the viewer's zone and clock, plus the relative expiry line.

const DAY = { day: 'numeric', month: 'long' } as const;
const WEEKDAY = { weekday: 'long', day: 'numeric', month: 'long' } as const;
const FULL = { ...WEEKDAY, year: 'numeric' } as const;

type Expiry = Pick<ShortLinkRow, 'status' | 'expiresAt'>;

export interface LinkDates {
  now: Date;
  tz: string;
  day: (iso: string) => string;
  weekday: (iso: string) => string;
  /** The weekday, the date and the clock. */
  dayClock: (iso: string) => string;
  /** The weekday, the date with its year, and the clock. */
  full: (iso: string) => string;
  clock: (iso: string) => string;
  expiry: (row: Expiry) => { parts: ExpiryParts; text: string };
}

export function useLinkDates(): LinkDates {
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const now = useNow();
  const day = (iso: string) => dateText(new Date(iso), { tz, locale }, DAY);
  return {
    now,
    tz,
    day,
    weekday: (iso) => dateText(new Date(iso), { tz, locale }, WEEKDAY),
    dayClock: (iso) => dateAndClock(new Date(iso), clock, WEEKDAY),
    full: (iso) => dateAndClock(new Date(iso), clock, FULL),
    clock: (iso) => clockOf(new Date(iso), clock),
    expiry: (row) => {
      const parts = expiryParts(row, { now, tz, purgeDays: SHORT_LINK_PURGE_DAYS });
      return { parts, text: expiryText(parts, { words: t.shortLinks.expiry, date: day }) };
    },
  };
}
