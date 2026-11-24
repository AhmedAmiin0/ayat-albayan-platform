import { channelRows, threadMessages, unreadBand, type ChannelRow } from '@ab/client-core';
import { atOrAfter, type ChannelMessageView, type ChannelPage } from '@ab/shared';
import { chatDayKey } from '@ab/time';
import { useState } from 'react';
import { dayChipText } from './day-text';

interface Source {
  pages: readonly ChannelPage[];
  tz: string;
  now: Date;
  /** Older pages exist: the oldest loaded day may start before them, so it shows no chip. */
  more: boolean;
}

/** The thread as it was when it opened: the read mark and the newest message then. */
interface Opening {
  mark: string | null;
  newest: string;
}

export type ThreadRow = ChannelRow & { arrived: boolean };

/** Came in after the thread opened (never a message of the first load or an older page). */
const cameAfter = (opening: Opening, m: ChannelMessageView): boolean =>
  opening.newest === '' || !atOrAfter(opening.newest, m.created_at);

/**
 * The thread's rows oldest first (the shared channelRows): a day chip over each day's first
 * message, the unread band where the chat stood when it opened (kept there while she reads on, as
 * WhatsApp's), the run's follow-ups, and which rows arrived while it was open.
 */
export function useThreadRows({ pages, tz, now, more }: Source): ThreadRow[] {
  const messages = threadMessages(pages);
  const [opening] = useState<Opening>(() => ({
    mark: pages[0]?.my_last_read_at ?? null,
    newest: messages.at(-1)?.created_at ?? '',
  }));
  const rows = channelRows({
    messages,
    dayKey: (iso) => chatDayKey(new Date(iso), tz),
    dayText: (iso) => dayChipText(iso, { now, tz }),
    band: unreadBand(messages, opening.mark),
    more,
  });
  return rows.reverse().map((row) => ({ ...row, arrived: cameAfter(opening, row.message) }));
}
