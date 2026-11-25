import { intlLocale, type Locale } from '@ab/core';
import { clockOf, type ClockOptions, weekdayDayMonth } from '@ab/time';
import { meetingLinkParts, type MeetingHost } from './meeting-link';

// Queued booking confirmation (R-SCH-06, R-LES-02). Three Meta-approved templates, all with
// {{1}} = name and {{2}} = date/time text; the two link templates add a URL button whose
// parameter is the part after the host (the Meet code or the Jitsi room slug).

export const BOOKING_TEMPLATE_KEYS = [
  'booking_confirmation',
  'booking_confirmation_meet',
  'booking_confirmation_plain',
] as const;
export type BookingTemplateKey = (typeof BOOKING_TEMPLATE_KEYS)[number];

export interface BookingTemplate {
  key: BookingTemplateKey;
  /** URL-button parameter (meeting code / room slug); null for the plain template. */
  button: string | null;
}

const BY_HOST: Record<MeetingHost, BookingTemplateKey> = {
  jitsi: 'booking_confirmation',
  meet: 'booking_confirmation_meet',
};

/** meet.jit.si/<slug> → booking_confirmation, meet.google.com/<code> → _meet, else → _plain. */
export function bookingConfirmationTemplate(
  meetingLink: string | null | undefined,
): BookingTemplate {
  const { host, slug } = meetingLinkParts(meetingLink);
  return host ? { key: BY_HOST[host], button: slug } : { key: 'booking_confirmation_plain', button: null };
}

/** lessonWhenText in the 12 or 24 h cycle the viewer chose. */
export function lessonWhenAt(startsAt: Date, opts: ClockOptions): string {
  return `${weekdayDayMonth(startsAt, opts)} ${clockOf(startsAt, opts)}`;
}

/** Wall-clock in the guardian's `tz`, Western digits; WhatsApp text is always Arabic and 24 h. */
export function lessonWhenText(startsAt: Date, tz: string, locale: Locale = 'ar'): string {
  return lessonWhenAt(startsAt, { tz, locale, cycle: '24' });
}

const listFormats = new Map<Locale, Intl.ListFormat>();

/** Created on first use: Hermes may lack Intl.ListFormat and the mobile app imports this module. */
export function joinNames(names: readonly string[], locale: Locale = 'ar'): string {
  let f = listFormats.get(locale);
  if (!f) {
    f = new Intl.ListFormat(intlLocale(locale), { type: 'conjunction' });
    listFormats.set(locale, f);
  }
  return f.format(names);
}

/** The makeup confirmation's {{1}}, so the approved template body reads naturally. */
export function makeupNames(names: readonly string[], locale: Locale = 'ar'): string {
  const joined = joinNames(names, locale);
  if (locale !== 'ar') return `makeup for ${joined}`;
  // Arabic grammar: the prefix before a name starting with the article drops the alef.
  return `تعويضية ${joined.startsWith('ال') ? `لل${joined.slice(2)}` : `لـ${joined}`}`;
}
