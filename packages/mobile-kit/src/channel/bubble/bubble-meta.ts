import { channelTimeText, isPending } from '@ab/client-core';
import type { ChannelMessageView, ClockCycle } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { locale } from '../../lib/i18n/locale';

interface MetaInput {
  tz: string;
  now: Date;
  cycle: ClockCycle;
}

export function metaText(m: ChannelMessageView, input: MetaInput): string {
  if (isPending(m)) return t.studentChannel.sending;
  const time = channelTimeText({ iso: m.created_at, ...input, locale });
  return m.edited ? `${t.studentChannel.actions.edited} · ${time}` : time;
}
