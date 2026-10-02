import type { ThreadDetail, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../teachers/http';
import { MessageViews } from '../whatsapp/message.views';
import { ReadReceipts } from './read-receipts';
import { toThreadView } from './threads.mapper';
import { ThreadsQueries, type ThreadListFilter } from './threads.queries';

export interface ThreadPageQuery {
  phone: string;
  /** created_at of the oldest loaded message: the page before it. */
  before?: string;
  limit: number;
}

/** H1/H2 (docs/12 §4, R-LEAD-02, R-MSG-05): the WhatsApp inbox over v_threads and messages. */
@Injectable()
export class ThreadsService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
  ) {}

  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items, total } = await this.queries.list(f);
    return { items: items.map((r) => toThreadView(r, now)), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest. The first page (no `before`) marks the inbound rows read.
   * ponytail: one registry read per templated row (≤ 50, by pk); batch if threads get slow.
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    if (!q.before) await this.receipts.open(q.phone, now);
    const row = await this.queries.thread(q.phone);
    const rows = await this.queries.messages(q);
    const page = rows.slice(0, q.limit).reverse();
    return {
      thread: row ? toThreadView(row, now) : null,
      messages: await Promise.all(page.map((m) => this.views.view(m))),
      has_more: rows.length > q.limit,
    };
  }
}
