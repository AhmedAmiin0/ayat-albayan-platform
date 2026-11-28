import type { ReopenChoice, ThreadDetail, ThreadPeople, ThreadView } from '@ab/shared';
import type { ExtrasInput, PageExtras } from './threads.service.types';
import type { Page } from '@ab/core';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { MessageViews, ReopenPick, ReopenRequest } from '@/modules/messaging/whatsapp';
import { ReadReceipts } from '@/modules/messaging/inbox/reads/read-receipts';
import { InboxSettings, renewalThreshold } from '@/modules/messaging/inbox/inbox.settings';
import { familyTag, type FamilyTag } from '@/modules/messaging/inbox/people/thread-people.mapper';
import { ThreadMessagesRepo } from '@/modules/messaging/inbox/threads/store';
import {
  asRead,
  isFirstPage,
  pageRows,
  stampRead,
  type ThreadPageQuery,
} from '@/modules/messaging/inbox/reads/thread-page';
import { toThreadView, type ThreadRow } from './threads.mapper';
import { ThreadsRepo, type ThreadListFilter } from './threads.repo';

export type { ThreadPageQuery } from '@/modules/messaging/inbox/reads/thread-page';

/** H1/H2 (docs/12 §4, R-LEAD-02, R-MSG-05): the WhatsApp inbox over v_threads and messages. */
@Injectable()
export class ThreadsService {
  /** Property-injected (the constructor is at its limit); absent (unit tests): no reopen note. */
  @Optional() @Inject(ReopenRequest) private readonly reopen?: ReopenRequest;
  /** The bar's live reopen and preselected template (closed window). */
  @Optional() @Inject(ReopenPick) private readonly pick?: ReopenPick;
  /** The ring's renewal threshold (inbox.settings.ts); absent (unit tests): the default. */
  @Optional() @Inject(InboxSettings) private readonly settings?: InboxSettings;

  constructor(
    private readonly queries: ThreadsRepo,
    private readonly views: MessageViews,
    private readonly receipts: ReadReceipts,
    private readonly messages: ThreadMessagesRepo,
  ) {}

  /**
   * Each row's family tags come from its guardian's students (one read for the whole page, beside
   * the unsupported marks).
   */
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
   * One page, oldest → newest, in two parallel stages (thread-page.ts): the thread and the page,
   * then the people, lessons, bubbles (templates from TemplatesQueries' copy) and, only when
   * something is unread, the read stamp. The first page carries the people; an older page
   * (`before`) gets the list's cheap tags instead (one read, not 1 + 3 a child).
   */
  async detail(q: ThreadPageQuery, now = new Date()): Promise<ThreadDetail> {
    const [at, threshold] = await Promise.all([
      pageRows({ threads: this.queries, messages: this.messages }, q),
      renewalThreshold(this.settings),
    ]);
    const page = at.rows.slice(0, q.limit).reverse();
    const [extras, messages, read, reopenUsable] = await Promise.all([
      this.extras({ first: isFirstPage(q), at, now, threshold }),
      Promise.all(page.map((m) => this.views.view(m))),
      stampRead(this.receipts, { q, page: at, now }),
      this.reopenUsable(),
    ]);
    const opts = { tag: extras.tag, reopenUsable };
    const view = at.found ? toThreadView(at.found, now, opts) : null;
    const detail: ThreadDetail = {
      thread: await this.picked(view, now),
      messages,
      has_more: at.rows.length > q.limit,
      lessons: extras.lessons,
      people: extras.people,
    };
    return read ? asRead(detail, now) : detail;
  }

  /** The first page carries the people and lessons; an older page only the list's cheap tags. */
  private async extras(x: ExtrasInput): Promise<PageExtras> {
    if (!x.first) {
      return { people: NO_PEOPLE, lessons: [], tag: await this.tagOf(x.at.found, x.threshold) };
    }
    const who = x.at.who;
    const [people, lessons] = await Promise.all([
      this.queries.people(who),
      who ? this.queries.lessons(who, x.now) : [],
    ]);
    return { people, lessons, tag: familyTag(people.students, x.threshold) };
  }

  private async picked(view: ThreadView | null, now: Date): Promise<ThreadView | null> {
    return view && this.pick ? this.pick.thread(view, now) : view;
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
const guardiansOf = (rows: readonly ThreadRow[]): string[] =>
  rows.flatMap((r) => (r.guardian_id ? [r.guardian_id] : []));
