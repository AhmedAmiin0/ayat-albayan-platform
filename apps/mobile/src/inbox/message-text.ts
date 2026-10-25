import { clockTime, isUnavailableMessage, type MessageView, SESSION_WINDOW_MS, type ThreadView } from '@ab/shared';
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
 * The attachment line: its kind when there is a file; when there is neither file nor text (Meta's
 * `unsupported`, a location, a contact card…) what to do, as the web's: ask the sender to send it
 * again («هذه الرسالة غير متاحة» first for Meta's 131060); null for a plain text message.
 */
export function mediaLine(m: Pick<MessageView, 'body' | 'media_mime' | 'interactive_payload'>): string | null {
  if (m.media_mime) return t.inbox.media[mediaKind(m.media_mime)];
  if (m.body) return null;
  return isUnavailableMessage(m.interactive_payload) ? t.inbox.unavailable : t.inbox.media.other;
}

/** «قالب: تذكير الحلقة النهاردة — Jitsi»; an unknown key shows as itself, never blank. */
export function templateLine(key: string): string {
  const names: Record<string, string> = t.templates.names;
  return t.inbox.templateLine.replace('{name}', names[key] ?? key);
}

/** A thread row's last message: «إنت: …» for ours, media and templates named. */
export function threadPreview(th: ThreadView): string {
  const media = th.last_media_mime ? t.inbox.media[mediaKind(th.last_media_mime)] : null;
  const text = media
    ? [media, th.last_body].filter(Boolean).join(': ')
    : (th.last_body ?? (th.last_template_key ? templateLine(th.last_template_key) : t.inbox.media.other));
  return th.last_direction === 'outbound' ? `${t.inbox.you} ${text}` : text;
}

export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();
/**
 * [day, month, year] of the instant in `tz`, as plain numbers (engines differ on zero-padding).
 * Not display text, so a fixed locale whatever the UI language (the parts are compared, not shown).
 */
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

/** «أُرسلت … · وصلت … · قُرئت …»: every delivery time Meta reported on ours (the web's deliveryTitle). */
export function deliveryTimes(m: MessageView, options?: StampOptions): string {
  if (m.direction !== 'outbound') return '';
  const steps: [string, string | null][] = [
    [t.messages.sentAt, m.sent_at],
    [t.messages.deliveredAt, m.delivered_at],
    [t.messages.readAt, m.read_at],
  ];
  return steps.flatMap(([text, iso]) => (iso ? [text.replace('{time}', stamp(iso, options))] : [])).join(' · ');
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
