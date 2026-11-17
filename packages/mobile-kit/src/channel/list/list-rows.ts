import type { ChannelMessageView } from '@ab/shared';

/** One row of the thread: its message, its day's words, the chip over it, the unread band. */
export interface ChannelRow {
  message: ChannelMessageView;
  /** The words of its day (the floating chip reads the topmost row's). */
  dayText: string;
  /** The first message of its day: the chip over it. */
  opensDay: boolean;
  /** «n غير مقروءة» over it: the first message unread when the chat opened. */
  unread: number | null;
}

/** Where the unread band goes: the first unread message, and how many there are. */
interface UnreadBand {
  id: string;
  count: number;
}

interface RowsInput {
  /** Oldest first, as the pages give them. */
  messages: readonly ChannelMessageView[];
  /** The local calendar day of a time, and its words. */
  dayKey: (iso: string) => string;
  dayText: (iso: string) => string;
  band: UnreadBand | null;
  /** Older pages exist: the oldest loaded day may start before it, so it shows no chip. */
  more: boolean;
}

const opens = (input: RowsInput, i: number): boolean => {
  const older = input.messages[i - 1];
  const row = input.messages[i];
  if (!older || !row) return !input.more;
  return input.dayKey(older.created_at) !== input.dayKey(row.created_at);
};

/** The inverted list's rows, newest first. */
export function channelRows(input: RowsInput): ChannelRow[] {
  return input.messages
    .map((message, i) => ({
      message,
      dayText: input.dayText(message.created_at),
      opensDay: opens(input, i),
      unread: message.id === input.band?.id ? input.band.count : null,
    }))
    .reverse();
}

const isOthersAfter = (m: ChannelMessageView, readAt: string): boolean =>
  !m.mine && Date.parse(m.created_at) > Date.parse(readAt);

/** Everyone else's messages after the viewer's last read mark; null without a mark or none. */
export function unreadBand(
  messages: readonly ChannelMessageView[],
  readAt: string | null,
): UnreadBand | null {
  if (readAt === null) return null;
  const unread = messages.filter((m) => isOthersAfter(m, readAt));
  const first = unread[0];
  return first ? { id: first.id, count: unread.length } : null;
}
