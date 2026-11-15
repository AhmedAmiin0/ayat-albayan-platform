import { SESSION_WINDOW_MS } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';
import type { InboxMode } from '@/features/messaging/inbox/shared/mode';

// WhatsApp's 24 h customer-service window in words (docs/12 §3.5): open with the time left, or
// closed — then only a template, or the lesson rating, can be sent (and a tap reopens it). The
// rating is the admin's only (SendRatingButton), so teacher and sales read what reopens it for them.

const HOUR = 60 * 60_000;

/** Time left in the window, 0 when closed (no message from them yet, or more than 24 h ago). */
export function windowLeftMs(lastInboundAt: string | null, now: Date): number {
  if (!lastInboundAt) return 0;
  return Math.max(0, Date.parse(lastInboundAt) + SESSION_WINDOW_MS - now.getTime());
}

/** «23س», or «40د» in the last hour (never «0س» while still open). */
export function leftText(ms: number): string {
  if (ms >= HOUR) return t.inbox.window.hours.replace('{n}', String(Math.floor(ms / HOUR)));
  return t.inbox.window.minutes.replace('{n}', String(Math.max(1, Math.ceil(ms / 60_000))));
}

/** «المحادثة مفتوحة — تبقّى 23س» / «المحادثة مغلقة — أرسل قالبًا أو تقييمًا لإعادة فتحها» (admin; staff: closedStaff). */
export function windowText(lastInboundAt: string | null, now: Date, mode: InboxMode = 'admin'): { open: boolean; text: string } {
  const left = windowLeftMs(lastInboundAt, now);
  if (left <= 0) return { open: false, text: mode === 'admin' ? t.inbox.window.closed : t.inbox.window.closedStaff };
  return { open: true, text: t.inbox.window.open.replace('{left}', leftText(left)) };
}
