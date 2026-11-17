import type { ChannelMessageView, ChannelPage } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';

/** The thread's cached pages (useChannel): the newest page first. */
export type ChannelPages = InfiniteData<ChannelPage, string | undefined>;

/**
 * The cached thread with `row` as its newest message (the newest page's last), replacing an
 * earlier row of the same id (a retry); nothing cached yet → left as it is.
 */
export function withPending(
  data: ChannelPages | undefined,
  row: ChannelMessageView,
): ChannelPages | undefined {
  const [newest, ...older] = data?.pages ?? [];
  if (!data || !newest) return data;
  const messages = [...newest.messages.filter((m) => m.id !== row.id), row];
  return { ...data, pages: [{ ...newest, messages }, ...older] };
}
