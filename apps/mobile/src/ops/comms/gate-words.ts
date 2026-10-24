import { counted, type Glyph, type SendGateView, type Tone } from '@ab/shared';
import { t } from '@/lib/i18n';

// The server's send gate (GET /messages/gate) in words for the overview: the same lines the inbox
// GateNote and the web ServerGateNote use, so the phone never says «يعمل» while the server holds messages.

/** «الإرسال يعمل» / «الإرسال متوقف» as a chip. */
export function gateChip(gate: Pick<SendGateView, 'open'>): { tone: Tone; glyph: Glyph; label: string } {
  const s = t.templates.settings;
  return gate.open ? { tone: 'ok', glyph: 'fill', label: s.on } : { tone: 'neutral', glyph: 'struck', label: s.off };
}

/** Why it is closed (the admin's switch or WhatsApp not set up), the queue, and the allow-list. */
export function gateLines(gate: SendGateView): string[] {
  const s = t.templates.settings;
  const reason = gate.open ? null : gate.reason === 'switch_off' ? t.inbox.messagingOff : t.inbox.messagingOffServer;
  const queued = gate.queued === 0 ? s.queued.zero : counted(s.queued, gate.queued);
  return [reason, queued, gate.restricted === true ? s.recipientsRestricted : null].filter((l): l is string => l !== null);
}
