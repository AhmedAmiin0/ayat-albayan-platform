import type { Glyph, SendGateView, Tone } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/**
 * The «إرسال الرسائل» chip, honest about the server (docs/23a §E M1): ON with WhatsApp not set up
 * sends nothing («مفعّل هنا · لا يُرسل شيء», half glyph); ON under the allow-list reaches the
 * allowed numbers only. The switch is the only gate besides those two (no env fuse, docs/23).
 */
export function sendingChip(enabled: boolean, gate: SendGateView | undefined): { tone: Tone; glyph: Glyph; label: string } {
  const s = t.templates.settings;
  if (!enabled) return { tone: 'neutral', glyph: 'struck', label: s.off };
  // The server not known yet (loading or failed): never a green «يعمل» on the switch alone.
  if (!gate) return { tone: 'act', glyph: 'half', label: s.onUnknown };
  if (gate.reason === 'not_configured') return { tone: 'act', glyph: 'half', label: s.onBlocked };
  if (gate.restricted) return { tone: 'ok', glyph: 'half', label: s.onRestricted };
  return { tone: 'ok', glyph: 'fill', label: s.on };
}
