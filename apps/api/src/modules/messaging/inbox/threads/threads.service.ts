import type { ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { Page } from '../../../../common/http/http';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { familyTag, type FamilyTag } from '../people/thread-people.mapper';
import type { KnownNumber } from './known-number';
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

  /** Each row's family tags come from its guardian's students (one read for the whole page, beside the unsupported marks). */
  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const { items: rows, total } = await this.queries.list(f);
    const [items, tags] = await Promise.all([this.queries.unsupported(rows), this.queries.familyTags(guardiansOf(rows))]);
    const view = (r: ThreadRow) => toThreadView(r, now, r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null);
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest. The first page (no `before`) marks the inbound rows read and
   * carries the people; an older page gets the list's cheap tags instead (one read, not 1 + 3 a child).
   * ponytail: one registry read per templated row (≤ 50, by pk); batch if threads get slow.
   * Two parallel rounds after the read stamp: the thread + its messages, then people, tag, views, lessons.
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = !q.before;
    if (first) await this.receipts.open(q.phone, now);
    const [row, rows] = await Promise.all([this.queries.thread(q.phone), this.queries.messages(q)]);
    // A number with no message yet (a booked family, «محادثة جديدة»): its people and lessons, for the first template.
    const who = row ?? (first ? await this.queries.known(q.phone) : null);
    const [people, olderTag, messages, lessons] = await this.pageReads({ first, row, who, page: rows.slice(0, q.limit).reverse(), now });
    const thread = row ? toThreadView(row, now, first ? familyTag(people.students) : olderTag) : null;
    return { thread, messages, has_more: rows.length > q.limit, lessons, people };
  }

  /** The second round, all in parallel: people, an older page's tag, the bubbles and the lessons. */
  private pageReads(p: { first: boolean; row: ThreadRow | null; who: ThreadRow | KnownNumber | null; page: Parameters<MessageViews['view']>[0][]; now: Date }) {
    // The lessons need the guardian / teacher only, never the tag.
    const lessonsOf = p.row ? toThreadView(p.row, p.now) : p.who;
    return Promise.all([
      p.first ? this.queries.people(p.who) : NO_PEOPLE,
      p.first ? null : this.tagOf(p.row),
      Promise.all(p.page.map((m) => this.views.view(m))),
      p.first && lessonsOf ? this.queries.lessons(lessonsOf, p.now) : [],
    ]);
  }

  private async tagOf(row: ThreadRow | null): Promise<FamilyTag | null> {
    if (!row?.guardian_id) return null;
    return (await this.queries.familyTags([row.guardian_id])).get(row.guardian_id) ?? null;
  }
}

const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };
const guardiansOf = (rows: readonly ThreadRow[]): string[] => rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
