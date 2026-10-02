import { clockTime, type MessageView, SESSION_WINDOW_MS } from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';

// The words a thread shows (R-MOB-02): media labels, template names, times, send errors.
// All Arabic comes from ar.json; times are the device's zone, Western digits.

export type MediaKind = keyof typeof t.inbox.media;

/** inbox.media.<kind> for a WhatsApp mime type. WhatsApp stickers are webp images. */
export function mediaKind(mime: string | null): MediaKind {
  if (!mime) return 'other';
  if (mime === 'image/webp') return 'sticker';
  const top = mime.split('/')[0];
  if (top === 'image' || top === 'audio' || top === 'video') return top;
  if (top === 'application' || top === 'text') return 'document';
  return 'other';
}

/**
 * The attachment line: its kind when there is a file; «رسالة مش مدعومة» when there is neither file
 * nor text (a location, a contact card…); null for a plain text message.
 */
export function mediaLine(m: Pick<MessageView, 'body' | 'media_mime'>): string | null {
  if (m.media_mime) return t.inbox.media[mediaKind(m.media_mime)];
  return m.body ? null : t.inbox.media.other;
}

/** «قالب: تذكير الحلقة النهاردة — Jitsi»; an unknown key shows as itself, never blank. */
export function templateLine(key: string): string {
  const names: Record<string, string> = t.templates.names;
  return t.inbox.templateLine.replace('{name}', names[key] ?? key);
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();
/** [day, month, year] of the instant in `tz`, as plain numbers (engines differ on zero-padding). */
function dayOf(at: Date, tz: string): number[] {
  let f = dayFormats.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: tz });
    dayFormats.set(tz, f);
  }
  const parts = f.formatToParts(at);
  return (['day', 'month', 'year'] as const).map((k) => Number(parts.find((p) => p.type === k)?.value));
}

export interface StampOptions {
  now?: Date;
  tz?: string;
}

/** «08:05» today, «30/9 08:05» another day, in the device's zone (or `tz`). */
export function stamp(iso: string, { now = new Date(), tz = deviceTimeZone() }: StampOptions = {}): string {
  const at = new Date(iso);
  const clock = clockTime(at, tz);
  const [day, month, year] = dayOf(at, tz);
  const [today, thisMonth, thisYear] = dayOf(now, tz);
  if (day === today && month === thisMonth && year === thisYear) return clock;
  return `${day}/${month} ${clock}`;
}

/** «تقدر ترد برسالة عادية لحد …»: 24 h after their last message (R-MSG-03). */
export function sessionUntil(lastInboundAt: string, options?: StampOptions): string {
  const end = new Date(Date.parse(lastInboundAt) + SESSION_WINDOW_MS).toISOString();
  return t.inbox.sessionOpenUntil.replace('{time}', stamp(end, options));
}

/** «هتتبعت …» for a row scheduled later (a booking confirmation, a reminder), else null. */
export function queuedLine(m: Pick<MessageView, 'status' | 'scheduled_for'>, options?: StampOptions) {
  const now = options?.now ?? new Date();
  if (m.status !== 'queued' || !m.scheduled_for || Date.parse(m.scheduled_for) <= now.getTime()) {
    return null;
  }
  return t.messages.queuedFor.replace('{time}', stamp(m.scheduled_for, options));
}

/** «السبب: …» from Meta's code (messages.errors), or the unknown line carrying the code. */
export function errorLine(m: Pick<MessageView, 'error_code'>): string {
  const errors: Record<string, string> = t.messages.errors;
  const code = m.error_code ?? '';
  const known = code !== 'unknown' ? errors[code] : undefined;
  const reason = known ?? t.messages.errors.unknown.replace('{code}', code || '—');
  return t.messages.errorLine.replace('{reason}', reason);
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** A refused send in Arabic: inbox.error.<code> (session_closed…), else «الرسالة متبعتتش…». */
export function sendError(error: unknown): string {
  const code = error instanceof ApiError && isRecord(error.body) ? error.body['code'] : undefined;
  const errors: Record<string, string> = t.inbox.error;
  return (typeof code === 'string' ? errors[code] : undefined) ?? t.inbox.error.send_failed;
}
