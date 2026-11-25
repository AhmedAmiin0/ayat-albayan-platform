import type { SendGateView } from '@ab/shared';
import type { Glyph, Tone } from '@ab/money';
import { t } from '@ab/web-kit';

/** ON with WhatsApp not set up sends nothing; under the allow-list only allowed numbers. */
export function sendingChip(
  enabled: boolean,
  gate: SendGateView | undefined,
): { tone: Tone; glyph: Glyph; label: string } {
  const s = t.templates.settings;
  if (!enabled) return { tone: 'neutral', glyph: 'struck', label: s.off };
  // With the server state unknown, never show working on the switch alone.
  if (!gate) return { tone: 'act', glyph: 'half', label: s.onUnknown };
  if (gate.reason === 'not_configured') return { tone: 'act', glyph: 'half', label: s.onBlocked };
  if (gate.restricted) return { tone: 'ok', glyph: 'half', label: s.onRestricted };
  return { tone: 'ok', glyph: 'fill', label: s.on };
}
