import { threadMessages } from '@ab/client-core';
import { chatDayKey, type ChannelPage } from '@ab/shared';
import { phoneTz } from '../../lib/clock/phone-tz';
import { useNow } from '../../lib/time/use-now';
import type { ChannelRef } from '../channel-api';
import { channelDayLabel } from './day-label';
import { channelRows, unreadBand } from './list-rows';
import { useOpeningReadMark } from './use-read-mark';

interface RowsSource {
  pages: readonly ChannelPage[] | undefined;
  /** Older pages exist. */
  more: boolean;
}

/** The thread's rows on the phone's clock, with the band at the mark of the opening. */
export function useChannelRows(ref: ChannelRef, { pages, more }: RowsSource) {
  const now = useNow();
  const tz = phoneTz();
  const messages = threadMessages(pages);
  const band = unreadBand(messages, useOpeningReadMark(ref) ?? null);
  const rows = channelRows({
    messages,
    dayKey: (iso) => chatDayKey(new Date(iso), tz),
    dayText: (iso) => channelDayLabel(iso, { now, tz }),
    band,
    more,
  });
  return { rows, clock: { tz, now } };
}
