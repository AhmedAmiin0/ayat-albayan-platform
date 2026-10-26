import { callEntryKind, formatCallDuration, formatPhone, type CallEntryKind, type CallView } from '@ab/shared';
import type { IconName } from '@/components/ui/display/icon';
import { t } from '@/lib/i18n/i18n';
import { showsPhone, type InboxMode } from '../../shared/mode';

/** «مكالمة صوتية صادرة · 2:14», «مكالمة واردة · 0:40», «مكالمة فائتة», «لم يُرَدّ», «مكالمة جارية». */
export function callEntryText(call: CallView): string {
  const kind = callEntryKind(call);
  const word = t.calls.entry[kind];
  const talked = (kind === 'outgoing' || kind === 'incoming') && call.duration_seconds !== null;
  return talked ? `${word} · ${formatCallDuration(call.duration_seconds ?? 0)}` : word;
}

/** The glyph WhatsApp puts beside a call: an arrow out for ours, in for theirs. */
export const callGlyph = (call: Pick<CallView, 'direction'>): IconName => (call.direction === 'outbound' ? 'call-out' : 'call-in');

/** The ink of a call: a missed one in the danger tone (red), the rest quiet. */
export function callTone(kind: CallEntryKind): string {
  if (kind === 'missed') return 'text-danger';
  return kind === 'live' ? 'text-ok' : 'text-ink-3';
}

/** Who a call was with, as the inbox names a chat: a teacher never sees the number. */
export function callerName(call: Pick<CallView, 'display_name' | 'phone_e164'>, mode: InboxMode): string {
  return call.display_name ?? (showsPhone(mode) ? formatPhone(call.phone_e164) : t.inbox.unknownNumber);
}
