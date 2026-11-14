import type { ReopenChoice, ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ReopenPick, ReopenRequest } from '@/modules/messaging/whatsapp';
import type { Page } from '@/common/http/http';
import { MessageViews } from '@/modules/messaging/whatsapp/messages/message.views';
import { ReadReceipts } from '@/modules/messaging/inbox/reads/read-receipts';
import { InboxSettings, renewalThreshold } from '@/modules/messaging/inbox/inbox.settings';
import { familyTag, type FamilyTag } from '@/modules/messaging/inbox/people/thread-people.mapper';
import { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';
import { asRead, isFirstPage, pageRows, stampRead, type ThreadPageQuery } from '@/modules/messaging/inbox/reads/thread-page';
import { toThreadView, type ThreadRow } from './threads.mapper';
import { ThreadsRepo, type ThreadListFilter } from './threads.repo';

export type { ThreadPageQuery } from '@/modules/messaging/inbox/reads/thread-page';

/** H1/H2 (docs/12 §4, R-LEAD-02, R-MSG-05): the WhatsApp inbox over v_threads and messages. */
@Injectable()
export class ThreadsService {
  /** Property-injected (the constructor is at its limit); absent (unit tests): no reopen note. */
  @Optional() @Inject(ReopenRequest) private readonly reopen?: ReopenRequest;
  /** The bar's live reopen and preselected template (closed window, owner 2026-11-14). */
  @Optional() @Inject(ReopenPick) private readonly pick?: ReopenPick;
  /** The ring's renewal threshold (inbox.settings.ts); absent (unit tests): the default. */
  @Optional() @Inject(InboxSettings) private readonly settings?: InboxSettings;

  constructor(
    private readonly queries: ThreadsRepo,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
    private readonly messages: ThreadMessagesRepo,
  ) {}

  /** Each row's family tags come from its guardian's students (one read for the whole page, beside the unsupported marks). */
  async list(f: ThreadListFilter, now = new Date()): Promise<Page<ThreadView>> {
    const [{ items: rows, total }, threshold] = await Promise.all([
      this.queries.list(f), renewalThreshold(this.settings),
    ]);
    const [items, tags, reopenUsable] = await Promise.all([
      this.queries.unsupported(rows),
      this.queries.familyTags(guardiansOf(rows), threshold),
      this.reopenUsable(),
    ]);
    const tagOf = (r: ThreadRow) => (r.guardian_id ? (tags.get(r.guardian_id) ?? null) : null);
    const view = (r: ThreadRow) => toThreadView(r, now, { tag: tagOf(r), reopenUsable });
    return { items: items.map(view), total, page: f.page, pageSize: f.pageSize };
  }

  /**
   * One page, oldest → newest, in two parallel stages (thread-page.ts): the thread and the page, then
   * the people, lessons, bubbles (templates from TemplatesQueries' copy) and, only when something is
   * unread, the read stamp. The first page carries the people; an older page (`before`) gets the
   * list's cheap tags instead (one read, not 1 + 3 a child).
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const first = isFirstPage(q);
    const [at, threshold] = await Promise.all([
      pageRows({ threads: this.queries, messages: this.messages }, q), renewalThreshold(this.settings),
    ]);
    const page = at.rows.slice(0, q.limit).reverse();
    const [people, lessons, messages, tag, read, reopenUsable] = await Promise.all([
      first ? this.queries.people(at.who) : NO_PEOPLE,
      first && at.who ? this.queries.lessons(at.who, now) : [],
      Promise.all(page.map((m) => this.views.view(m))),
      first ? null : this.tagOf(at.found, threshold),
      stampRead(this.receipts, { q, page: at, now }),
      this.reopenUsable(),
    ]);
    const opts = { tag: first ? familyTag(people.students, threshold) : tag, reopenUsable };
    const view = at.found ? toThreadView(at.found, now, opts) : null;
    const thread = view && this.pick ? await this.pick.thread(view, now) : view;
    const detail: ThreadDetail = { thread, messages, has_more: at.rows.length > q.limit, lessons, people };
    return read ? asRead(detail, now) : detail;
  }

  /** A closed Kapso chat is offered only while it can reopen (review 11-05): template or wait. */
  private async reopenUsable(): Promise<ReopenChoice | null> {
    // A failed settings or registry read only drops the note: the chat list still answers.
    return (await this.reopen?.usable().catch(() => null)) ?? null;
  }

  private async tagOf(row: ThreadRow | null, threshold: number): Promise<FamilyTag | null> {
    if (!row?.guardian_id) return null;
    const tags = await this.queries.familyTags([row.guardian_id], threshold);
    return tags.get(row.guardian_id) ?? null;
  }
}

const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };
const guardiansOf = (rows: readonly ThreadRow[]): string[] => rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
