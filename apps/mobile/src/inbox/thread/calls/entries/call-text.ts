import { callEntryKind, formatCallDuration, formatPhone, type CallEntryKind, type CallView } from '@ab/shared';
import type { Palette } from '@/theme';
import { t } from '@/core/lib/i18n/i18n';

/** «مكالمة صوتية صادرة · 2:14», «مكالمة واردة · 0:40», «مكالمة فائتة», «لم يُرَدّ», «مكالمة جارية». */
export function callEntryText(call: CallView): string {
  const kind = callEntryKind(call);
  const word = t.calls.entry[kind];
  const talked = (kind === 'outgoing' || kind === 'incoming') && call.duration_seconds !== null;
  return talked ? `${word} · ${formatCallDuration(call.duration_seconds ?? 0)}` : word;
}

/** The ink of a call: a missed one in the danger tone (red), a live one green, the rest quiet. */
export function callInk(kind: CallEntryKind, color: Palette): string {
  if (kind === 'missed') return color.bad;
  return kind === 'live' ? color.ok : color.ink2;
}

/** Who a call was with, as the inbox names a chat: a teacher never sees the number. */
export function callerName(call: Pick<CallView, 'display_name' | 'phone_e164'>, showsPhone: boolean): string {
  return call.display_name ?? (showsPhone ? formatPhone(call.phone_e164) : t.inbox.unknownNumber);
}
