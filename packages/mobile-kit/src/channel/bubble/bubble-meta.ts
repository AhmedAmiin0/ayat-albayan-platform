import { channelTimeText } from '@ab/client-core';
import type { ChannelMessageView, ClockCycle } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';

interface MetaInput {
  tz: string;
  now: Date;
  cycle: ClockCycle;
}

/** The meta row's text: the time, after «تم التعديل ·» once edited (owner 2026-10-30). */
export function metaText(m: ChannelMessageView, input: MetaInput): string {
  const time = channelTimeText({ iso: m.created_at, ...input, locale });
  return m.edited ? `${t.studentChannel.actions.edited} · ${time}` : time;
}

/**
 * The ticks of my message (owner: «read» only, as WhatsApp's two): ✓ sent, blue ✓✓ once every
 * other participant has read it. No ticks on others' messages or a deleted one.
 */
export function ticksOf(m: ChannelMessageView): 'sent' | 'read' | null {
  if (!m.mine || m.deleted) return null;
  return m.read_by_all ? 'read' : 'sent';
}
