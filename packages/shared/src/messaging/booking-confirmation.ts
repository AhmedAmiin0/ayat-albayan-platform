import { clockTime } from '../running-head.js';

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

const BY_HOST: Record<string, BookingTemplateKey> = {
  'meet.jit.si': 'booking_confirmation',
  'meet.google.com': 'booking_confirmation_meet',
};

// No URL global here: @ab/shared also runs on Hermes, whose URL lacks hostname/pathname.
const LINK = /^https?:\/\/([^/?#]+)\/([^?#]*)/i;

/** meet.jit.si/<slug> → booking_confirmation, meet.google.com/<code> → _meet, else → _plain. */
export function bookingConfirmationTemplate(
  meetingLink: string | null | undefined,
): BookingTemplate {
  const [, host = '', path = ''] = LINK.exec(meetingLink?.trim() ?? '') ?? [];
  const key = BY_HOST[host.toLowerCase()];
  const slug = path.replace(/\/+$/, '');
  return key && slug ? { key, button: slug } : { key: 'booking_confirmation_plain', button: null };
}

const whenFormatters = new Map<string, Intl.DateTimeFormat>();

/** {{2}}: «الأحد 4 أكتوبر 17:00», wall-clock in `tz` (the guardian's), Western digits, 24h. */
export function lessonWhenText(startsAt: Date, tz: string): string {
  let f = whenFormatters.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('ar-EG-u-nu-latn', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: tz,
    });
    whenFormatters.set(tz, f);
  }
  const parts = f.formatToParts(startsAt);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value;
  return [part('weekday'), part('day'), part('month'), clockTime(startsAt, tz)].join(' ');
}

let listFormat: Intl.ListFormat | undefined;

/**
 * {{1}} for several children of one guardian: «سهيلة ومريم» (Intl.ListFormat, attached و).
 * Created on first use: Hermes may lack Intl.ListFormat and the mobile app imports this module.
 */
export function joinNames(names: readonly string[]): string {
  listFormat ??= new Intl.ListFormat('ar', { type: 'conjunction' });
  return listFormat.format(names);
}
