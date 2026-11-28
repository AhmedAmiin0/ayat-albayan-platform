import type { ThreadView } from '@ab/shared';

/** One page of GET /threads as the cache holds it. */
export interface ListPage {
  items: ThreadView[];
  total: number;
  page: number;
  pageSize: number;
}

/** A cached chats list (TanStack's InfiniteData of ListPage). */
export interface ListPages<P extends ListPage = ListPage> {
  pages: P[];
}
