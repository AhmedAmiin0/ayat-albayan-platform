import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView, ClockCycle } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';
import { isPending } from '../send/pending';

interface MetaInput {
  tz: string;
  now: Date;
  cycle: ClockCycle;
}

/**
 * The meta row's text: «جارٍ الإرسال…» while on its way, else the time, after «تم التعديل ·» once
 * edited (owner 2026-10-30).
 */
export function metaText(m: ChannelMessageView, input: MetaInput): string {
  if (isPending(m)) return t.studentChannel.sending;
  const time = channelTimeText({ iso: m.created_at, ...input, locale });
  return m.edited ? `${t.studentChannel.actions.edited} · ${time}` : time;
}

type Ticks = 'queued' | 'sent' | 'read';

/**
 * The ticks of my message (owner: «read» only, as WhatsApp's two): the clock while on its way, ✓
 * sent, blue ✓✓ once every other participant has read it. None on others' or a deleted message.
 */
export function ticksOf(m: ChannelMessageView): Ticks | null {
  if (!m.mine || m.deleted) return null;
  if (isPending(m)) return 'queued';
  return m.read_by_all ? 'read' : 'sent';
}
