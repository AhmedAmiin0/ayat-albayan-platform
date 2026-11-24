import { atOrAfter, type ChannelMessageView } from '@ab/shared';

/** One row of the thread: its message, its day's words, the chip over it, the unread band. */
export interface ChannelRow {
  message: ChannelMessageView;
  /** The words of its day (the floating chip reads the topmost row's). */
  dayText: string;
  /** The first message of its day: the chip over it. */
  opensDay: boolean;
  /** The first message unread when the chat opened. */
  unread: number | null;
  /** The air over it: 4pt on the same side, 8pt when the side changes, 0 under a day chip. */
  space: number;
  /** The same sender again, nothing between: no name line and no tail corner. */
  followUp: boolean;
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

type Speaker = Pick<ChannelMessageView, 'mine' | 'sender_role' | 'sender_name'>;

const sameSender = (a: Speaker, b: Speaker): boolean =>
  a.mine === b.mine && a.sender_role === b.sender_role && a.sender_name === b.sender_name;

const opens = (input: RowsInput, i: number): boolean => {
  const older = input.messages[i - 1];
  const row = input.messages[i];
  if (!older || !row) return !input.more;
  return input.dayKey(older.created_at) !== input.dayKey(row.created_at);
};

type Placed = Omit<ChannelRow, 'space' | 'followUp'>;

/** 4pt under a message on the same side, 8pt when the side changes. */
const sideSpace = (older: ChannelMessageView | undefined, m: ChannelMessageView): number =>
  older?.mine === m.mine ? 4 : 8;

/** The air over a row and whether it follows the same sender (the ChatX boards' rhythm). */
function rhythm(older: ChannelMessageView | undefined, row: Placed) {
  if (row.opensDay) return { space: 0, followUp: false };
  const followUp = row.unread === null && older !== undefined && sameSender(older, row.message);
  return { space: sideSpace(older, row.message), followUp };
}

/** The inverted list's rows, newest first. */
export function channelRows(input: RowsInput): ChannelRow[] {
  return input.messages
    .map((message, i) => {
      const row = {
        message,
        dayText: input.dayText(message.created_at),
        opensDay: opens(input, i),
        unread: message.id === input.band?.id ? input.band.count : null,
      };
      return { ...row, ...rhythm(input.messages[i - 1], row) };
    })
    .reverse();
}

/** Someone else's message after the read mark, to the microsecond (Postgres keeps them). */
const isOthersAfter = (m: ChannelMessageView, readAt: string): boolean =>
  !m.mine && !atOrAfter(readAt, m.created_at);

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
