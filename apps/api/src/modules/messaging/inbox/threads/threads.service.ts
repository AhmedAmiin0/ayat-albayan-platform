import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../../../../common/http/http';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { familyTag, type FamilyTag } from '../people/thread-people.mapper';
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

  /** Each row's family tags come from its guardian's students (one read for the whole page). */
  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items, total } = await this.queries.list(f);
    const tags = await this.queries.familyTags(guardiansOf(items));
    const view = (r: ThreadRow) => toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null);
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest. The first page (no `before`) marks the inbound rows read and
   * carries the people; an older page gets the list's cheap tags instead (one read, not 1 + 3 a child).
   * ponytail: one registry read per templated row (≤ 50, by pk); batch if threads get slow.
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = !q.before;
    if (first) await this.receipts.open(q.phone, now);
    const row = await this.queries.thread(q.phone);
    // A number with no message yet (a booked family, «محادثة جديدة»): its people and lessons, for the first template.
    const who = row ?? (first ? await this.queries.known(q.phone) : null);
    const [rows, people] = await Promise.all([this.queries.messages(q), first ? this.queries.people(who) : NO_PEOPLE]);
    const page = rows.slice(0, q.limit).reverse();
    const tag = first ? familyTag(people.students) : await this.tagOf(row);
    const thread = row ? toThreadView(row, now, tag) : null;
    return {
      thread,
      messages: await Promise.all(page.map((m) => this.views.view(m))),
      has_more: rows.length > q.limit,
      lessons: first && who ? await this.queries.lessons(thread ?? who, now) : [],
      people,
    };
  }

  private async tagOf(row: ThreadRow | null): Promise<FamilyTag | null> {
    if (!row?.guardian_id) return null;
    return (await this.queries.familyTags([row.guardian_id])).get(row.guardian_id) ?? null;
  }
}

const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };
const guardiansOf = (rows: readonly ThreadRow[]): string[] => rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
