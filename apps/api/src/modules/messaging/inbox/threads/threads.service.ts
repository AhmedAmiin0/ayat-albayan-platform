import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../../../../common/http/http';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { familyTag, type FamilyTag } from '../people/thread-people.mapper';
import { asRead, pageRows, stampRead, type ThreadPageQuery } from '../reads/thread-page';
import { toThreadView, type ThreadRow } from './threads.mapper';
import { ThreadsQueries, type ThreadListFilter } from './threads.queries';

export type { ThreadPageQuery } from '../reads/thread-page';

/** H1/H2 (docs/12 §4, R-LEAD-02, R-MSG-05): the WhatsApp inbox over v_threads and messages. */
@Injectable()
export class ThreadsService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
  ) {}

  /** Each row's family tags come from its guardian's students (one read for the whole page, beside the unsupported marks). */
  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items: rows, total } = await this.queries.list(f);
    const [items, tags] = await Promise.all([this.queries.unsupported(rows), this.queries.familyTags(guardiansOf(rows))]);
    const view = (r: ThreadRow) => toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null);
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest, in two parallel stages (thread-page.ts): the thread and the page, then
   * the people, lessons, bubbles (templates from TemplatesQueries' copy) and, only when something is
   * unread, the read stamp. The first page carries the people; an older page (`before`) gets the
   * list's cheap tags instead (one read, not 1 + 3 a child).
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = !q.before;
    const at = await pageRows(this.queries, q);
    const page = at.rows.slice(0, q.limit).reverse();
    const [people, lessons, messages, tag, read] = await Promise.all([
      first ? this.queries.people(at.who) : NO_PEOPLE,
      first && at.who ? this.queries.lessons(at.who, now) : [],
      Promise.all(page.map((m) => this.views.view(m))),
      first ? null : this.tagOf(at.found),
      stampRead(this.receipts, { q, page: at, now }),
    ]);
    const thread = at.found ? toThreadView(at.found, now, first ? familyTag(people.students) : tag) : null;
    const detail: ThreadDetail = { thread, messages, has_more: at.rows.length > q.limit, lessons, people };
    return read ? asRead(detail, now) : detail;
  }

  private async tagOf(row: ThreadRow | null): Promise<FamilyTag | null> {
    if (!row?.guardian_id) return null;
    return (await this.queries.familyTags([row.guardian_id])).get(row.guardian_id) ?? null;
  }
}

const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };
const guardiansOf = (rows: readonly ThreadRow[]): string[] => rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
