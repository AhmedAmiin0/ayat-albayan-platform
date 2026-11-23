import { linkStateLook, sendLook, type LinkTone } from '@ab/client-core';
import type { ShortLinkRow, ShortLinkSendStatus } from '@ab/shared';
import type { Tone } from '@ab/money';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';

// The chips of the short-link screens: a link's state («فعّال», «اكتمل العدد», «منتهٍ», «موقوف»)
// and a WhatsApp send («قيد الإرسال», «فشل», «لم يُرسل بعد»), in the shared status-chip colours
// and client-core's glyphs.

const TONE: Readonly<Record<LinkTone, Tone>> = {
  success: 'ok',
  warning: 'act',
  neutral: 'neutral',
  danger: 'bad',
};

interface StateChipProps {
  row: Pick<ShortLinkRow, 'status' | 'maxUsers' | 'visitors'>;
  size?: 'md' | 'sm';
}

export function StateChip({ row, size = 'sm' }: StateChipProps) {
  const look = linkStateLook(row);
  const label = t.shortLinks.state[look.key];
  return <StatusChip tone={TONE[look.tone]} glyph={look.glyph} label={label} size={size} />;
}

interface SendChipProps {
  status: ShortLinkSendStatus;
  /** «أُرسل 9»: the number of users in this state (the detail's summary). */
  count?: number;
}

export function SendChip({ status, count }: SendChipProps) {
  const look = sendLook(status);
  const word = t.shortLinks.send[look.key];
  const label = count === undefined ? word : `${word} ${count}`;
  return <StatusChip tone={TONE[look.tone]} glyph={look.glyph} label={label} size="sm" />;
}
