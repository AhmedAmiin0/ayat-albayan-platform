import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../../../common/http/http';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { forSales, salesLessons, salesPeople, visibleToSales, withoutLinks } from './sales-threads';
import { toThreadView, type ThreadRow } from '../threads/threads.mapper';
import type { PeopleOf } from '../people/thread-people';
import { ThreadsQueries, type ThreadListFilter } from '../threads/threads.queries';
import type { ThreadPageQuery } from '../threads/threads.service';

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
    const { items, total } = await this.queries.list(f);
    const guardians = items.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
    const tags = await this.queries.familyTags(guardians);
    const view = (r: ThreadRow) => forSales(toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null));
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /** One page, oldest → newest, of any chat. */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = !q.before;
    if (first) await this.receipts.open(q.phone, now);
    const row = await this.queries.thread(q.phone);
    // A number with no message yet: who it is, so the first template can name the family's lesson.
    const who = row ?? (first ? await this.queries.known(q.phone) : null);
    const [rows, people] = await Promise.all([this.queries.messages(q), first ? this.people(who) : NO_ONE]);
    const page = rows.slice(0, q.limit).reverse().filter(visibleToSales);
    const thread = row ? forSales(toThreadView(row, now, null)) : null;
    return {
      thread,
      messages: await Promise.all(page.map(async (m) => withoutLinks(await this.views.view(m)))),
      has_more: rows.length > q.limit,
      lessons: first && who ? salesLessons(await this.queries.lessons(thread ?? who, now)) : [],
      people,
    };
  }

  private async people(row: PeopleOf | null): Promise<ThreadPeople> {
    return salesPeople(await this.queries.people(row));
  }
}
