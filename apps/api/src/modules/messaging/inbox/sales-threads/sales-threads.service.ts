import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../../../../common/http/http';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { forSales, salesLessons, salesPeople, visibleToSales, withoutLinks } from './sales-threads';
import { toThreadView, type ThreadRow } from '../threads/threads.mapper';
import type { PeopleOf } from '../people/thread-people';
import { ThreadsQueries, type ThreadListFilter } from '../threads/threads.queries';
import { asRead, pageRows, stampRead, type ThreadPageQuery } from '../reads/thread-page';

const NO_ONE: ThreadPeople = { guardian: null, lead: null, students: [] };

/**
 * H1/H2 in sales mode: every chat (owner 2026-10-11, docs/16). Same payload as the admin's so the web
 * inbox reuses its components, without money flags, packages, meeting links or the two link
 * templates. Opening a thread marks it read, as for the admin.
 */
@Injectable()
export class SalesThreadsService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
  ) {}

  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items: rows, total } = await this.queries.list(f);
    const guardians = rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
    const [items, tags] = await Promise.all([this.queries.unsupported(rows), this.queries.familyTags(guardians)]);
    const view = (r: ThreadRow) => forSales(toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null));
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /** One page, oldest → newest, of any chat; the admin's two parallel stages (reads/thread-page.ts). */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = !q.before;
    const at = await pageRows(this.queries, q);
    const page = at.rows.slice(0, q.limit).reverse().filter(visibleToSales);
    const [people, lessons, messages, read] = await Promise.all([
      first ? this.people(at.who) : NO_ONE,
      first && at.who ? this.queries.lessons(at.who, now).then(salesLessons) : [],
      Promise.all(page.map(async (m) => withoutLinks(await this.views.view(m)))),
      stampRead(this.receipts, { q, page: at, now }),
    ]);
    const thread = at.found ? forSales(toThreadView(at.found, now, null)) : null;
    const detail: ThreadDetail = { thread, messages, has_more: at.rows.length > q.limit, lessons, people };
    return read ? asRead(detail, now) : detail;
  }

  private async people(row: PeopleOf | null): Promise<ThreadPeople> {
    return salesPeople(await this.queries.people(row));
  }
}
