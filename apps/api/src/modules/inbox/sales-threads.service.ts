import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../teachers/http';
import { assertSalesPhone, type SalesScope } from '../sales/sales-scope';
import { MessageViews } from '../whatsapp/message.views';
import { ReadReceipts } from './read-receipts';
import { forSales, salesLessons, salesPeople, visibleToSales, withoutLinks } from './sales-threads';
import { toThreadView, type ThreadRow } from './threads.mapper';
import { ThreadsQueries, type ThreadListFilter } from './threads.queries';
import type { ThreadPageQuery } from './threads.service';

const NO_ONE: ThreadPeople = { guardian: null, lead: null, students: [] };

/**
 * H1/H2 in sales mode: only the chats of the salesperson's leads and of the families those leads
 * became (SalesScope). Same payload as the admin's so the web inbox reuses its components, without
 * money flags and without the two link templates. Opening a thread marks it read, as for the admin.
 */
@Injectable()
export class SalesThreadsService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
  ) {}

  async list(f: ThreadListFilter, scope: SalesScope, now = new Date()): Promise<Page<ThreadView>> {
    const phones = [...scope.phones];
    const empty = { items: [], total: 0, page: f.page, pageSize: f.pageSize };
    if (phones.length === 0) return empty; // .in() with no phones is a PostgREST error
    const { items, total } = await this.queries.list({ ...f, phones });
    const guardians = items.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
    const tags = await this.queries.familyTags(guardians);
    const view = (r: ThreadRow) => forSales(toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null));
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /** One page, oldest → newest; 403 not_your_thread outside the scope. */
  async detail(q: ThreadPageQuery, scope: SalesScope, now = new Date()): Promise<ThreadDetail> {
    assertSalesPhone(scope, q.phone);
    const first = !q.before;
    if (first) await this.receipts.open(q.phone, now);
    const row = await this.queries.thread(q.phone);
    const [rows, people] = await Promise.all([this.queries.messages(q), first ? this.people(row, scope) : NO_ONE]);
    const page = rows.slice(0, q.limit).reverse().filter(visibleToSales);
    const thread = row ? forSales(toThreadView(row, now, null)) : null;
    return {
      thread,
      messages: await Promise.all(page.map(async (m) => withoutLinks(await this.views.view(m)))),
      has_more: rows.length > q.limit,
      lessons: thread && first ? salesLessons(await this.queries.lessons(thread, now)) : [],
      people,
    };
  }

  private async people(row: ThreadRow | null, scope: SalesScope): Promise<ThreadPeople> {
    return salesPeople(await this.queries.people(row), scope);
  }
}
