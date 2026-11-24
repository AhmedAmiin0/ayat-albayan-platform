import { channelRows, threadMessages, unreadBand } from '@ab/client-core';
import type { ChannelPage } from '@ab/shared';
import { chatDayKey } from '@ab/time';
import { phoneTz } from '../../lib/clock/phone-tz';
import { useNow } from '../../lib/time/use-now';
import { chatDayLabel } from '../../chat-ui/days/day-label';
import { useOpeningReadMark } from './use-read-mark';

interface RowsSource {
  pages: readonly ChannelPage[] | undefined;
  /** Older pages exist. */
  more: boolean;
}

/** The thread's rows on the phone's clock, with the band at the API's mark of the opening. */
export function useChannelRows({ pages, more }: RowsSource) {
  const now = useNow();
  const tz = phoneTz();
  const messages = threadMessages(pages);
  const band = unreadBand(messages, useOpeningReadMark(pages));
  const rows = channelRows({
    messages,
    dayKey: (iso) => chatDayKey(new Date(iso), tz),
    dayText: (iso) => chatDayLabel(iso, { now, tz }),
    band,
    more,
  });
  return { rows, clock: { tz, now } };
}
