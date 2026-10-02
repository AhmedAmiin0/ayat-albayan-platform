import { subscriptionBadge, type ThreadDetail, type ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../teachers/http';
import { MessageViews } from '../whatsapp/message.views';
import { ReadReceipts } from './read-receipts';
import { toThreadView, type ThreadRow } from './threads.mapper';
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

  /** Each row's `subscribed` comes from its guardian's students (one read for the whole page). */
  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items, total } = await this.queries.list(f);
    const subscribed = await this.queries.subscribedGuardians(items.flatMap((r) => (r.guardian_id ? [r.guardian_id] : [])));
    const view = (r: ThreadRow) => toThreadView(r, now, r.guardian_id !== null && subscribed.has(r.guardian_id));
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest. The first page (no `before`) marks the inbound rows read.
   * ponytail: one registry read per templated row (≤ 50, by pk); batch if threads get slow.
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    if (!q.before) await this.receipts.open(q.phone, now);
    const row = await this.queries.thread(q.phone);
    const [rows, people] = await Promise.all([this.queries.messages(q), this.queries.people(row)]);
    const page = rows.slice(0, q.limit).reverse();
    const thread = row ? toThreadView(row, now, subscriptionBadge(people.students) === 'subscribed') : null;
    return {
      thread,
      messages: await Promise.all(page.map((m) => this.views.view(m))),
      has_more: rows.length > q.limit,
      lessons: thread && !q.before ? await this.queries.lessons(thread, now) : [],
      people,
    };
  }
}
