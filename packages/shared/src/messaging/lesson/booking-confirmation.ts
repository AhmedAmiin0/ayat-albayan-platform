import { intlLocale, type Locale } from '../../i18n/locale.js';
import { clockOf, type ClockOptions } from '../../core/format/index.js';
import { meetingLinkParts, type MeetingHost } from './meeting-link.js';

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

const whenFormatters = new Map<string, Intl.DateTimeFormat>();

/** «الأحد 4 أكتوبر 5:00 م» on a screen: lessonWhenText in the cycle the viewer chose (12 or 24 h). */
export function lessonWhenAt(startsAt: Date, opts: ClockOptions): string {
  const key = `${opts.locale}|${opts.tz}`;
  let f = whenFormatters.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(intlLocale(opts.locale), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: opts.tz,
    });
    whenFormatters.set(key, f);
  }
  const parts = f.formatToParts(startsAt);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return [part('weekday'), part('day'), part('month'), clockOf(startsAt, opts)].join(' ');
}

/**
 * {{2}}: «الأحد 4 أكتوبر 17:00», wall-clock in `tz` (the guardian's), Western digits, 24h.
 * WhatsApp text is always Arabic (the default) and always 24 h; a screen passes its UI language,
 * so the English UI reads «Sunday 4 October 17:00» (screens with a clock choice use lessonWhenAt).
 */
export function lessonWhenText(startsAt: Date, tz: string, locale: Locale = 'ar'): string {
  return lessonWhenAt(startsAt, { tz, locale, cycle: '24' });
}

const listFormats = new Map<Locale, Intl.ListFormat>();

/**
 * {{1}} for several children of one guardian: «سهيلة ومريم» (Intl.ListFormat, attached و); a
 * screen passes its UI language («Suhaila and Mariam»). Created on first use: Hermes may lack
 * Intl.ListFormat and the mobile app imports this module.
 */
export function joinNames(names: readonly string[], locale: Locale = 'ar'): string {
  let f = listFormats.get(locale);
  if (!f) {
    f = new Intl.ListFormat(intlLocale(locale), { type: 'conjunction' });
    listFormats.set(locale, f);
  }
  return f.format(names);
}

/**
 * {{1}} of a makeup's confirmation: «تعويضية لـسهيلة», so the approved body «تم حجز حلقة {{1}} — {{2}}»
 * reads «تم حجز حلقة تعويضية لـسهيلة — الأحد 4 أكتوبر 17:00» (للزهراء for الزهراء). English for a screen in English.
 */
export function makeupNames(names: readonly string[], locale: Locale = 'ar'): string {
  const joined = joinNames(names, locale);
  if (locale !== 'ar') return `makeup for ${joined}`;
  // «لـ» + «الزهراء» is «للزهراء»: the article's alef drops (and the lam doubles).
  return `تعويضية ${joined.startsWith('ال') ? `لل${joined.slice(2)}` : `لـ${joined}`}`;
}
