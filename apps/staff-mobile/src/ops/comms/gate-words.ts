import { counted, type Glyph, type SendGateView, type Tone } from '@ab/shared';
import { t } from '@ab/mobile-kit';

// Uses the same words as the inbox GateNote and the web chip so the phone never disagrees.

export function gateChip(gate: Pick<SendGateView, 'open' | 'restricted'>): { tone: Tone; glyph: Glyph; label: string } {
  const s = t.templates.settings;
  if (!gate.open) return { tone: 'neutral', glyph: 'struck', label: s.off };
  return gate.restricted === true ? { tone: 'ok', glyph: 'half', label: s.onRestricted } : { tone: 'ok', glyph: 'fill', label: s.on };
}

/** Separates the reason from the queue in the one line beside the chip. */
export const GATE_LINE_SEPARATOR = ' · ';

/**
 * One line beside the chip: why it is closed (the admin's switch or WhatsApp not set up), then the
 * queue. The allow-list is in the chip's own words, so it needs no line of its own.
 */
export function gateLine(gate: SendGateView): string {
  const s = t.templates.settings;
  const reason = gate.open ? null : gate.reason === 'switch_off' ? t.inbox.messagingOff : t.inbox.messagingOffServer;
  const queued = gate.queued === 0 ? s.queued.zero : counted(s.queued, gate.queued);
  return reason ? `${reason}${GATE_LINE_SEPARATOR}${queued}` : queued;
}
