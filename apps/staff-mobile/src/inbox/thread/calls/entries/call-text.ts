import { callEntryText as entryText } from '@ab/client-core';
import type { CallEntryKind, CallView } from '@ab/shared';
import { formatPhone } from '@ab/core';
import { t } from '@ab/mobile-kit';
import type { Palette } from '@ab/mobile-kit';

/** «مكالمة صوتية صادرة · 2:14», «مكالمة واردة · 0:40», «مكالمة فائتة», «لم يُرَدّ», «مكالمة جارية». */
export const callEntryText = (call: CallView): string => entryText(call, t.calls);

/** The ink of a call: a missed one in the danger tone (red), a live one green, the rest quiet. */
export function callInk(kind: CallEntryKind, color: Palette): string {
  if (kind === 'missed') return color.bad;
  return kind === 'live' ? color.ok : color.ink2;
}

/** Who a call was with, as the inbox names a chat: a teacher never sees the number. */
export function callerName(call: Pick<CallView, 'display_name' | 'phone_e164'>, showsPhone: boolean): string {
  return call.display_name ?? (showsPhone ? formatPhone(call.phone_e164) : t.inbox.unknownNumber);
}
