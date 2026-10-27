import { DELTA_OVERLAP_MS, PENDING_WINDOW_MS, type MessageView, type ThreadDelta, type ThreadDeltaWindow, type ThreadView } from '@ab/shared';
import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { ThreadMessageRow } from '../../whatsapp/messages/message.mapper';
import { MessageViews } from '../../whatsapp/messages/message.views';
import { ReadReceipts } from '../reads/read-receipts';
import { visibleToSales, withoutLinks } from '../sales-threads/sales-threads';
import { assertPhone, type TeacherScope } from '../teacher-threads/teacher-scope';
import { TeacherThreadsQueries } from '../teacher-threads/teacher-threads.queries';
import { toThreadView } from '../threads/threads.mapper';
import { ThreadsQueries } from '../threads/threads.queries';
import { DeltaQueries } from './delta.queries';

/** GET /threads/:phone?after=: `after` = created_at of the newest row the client holds. */
export interface ThreadDeltaQuery {
  phone: string;
  after: string;
  /** The client's outgoing rows still moving (≤ PENDING_IDS_MAX uuids). */
  pending: readonly string[];
  limit: number;
}

/** Who reads: the admin, a salesperson (redacted like her pages) or a teacher (own families only). */
export type DeltaCaller = { kind: 'admin' } | { kind: 'sales' } | { kind: 'teacher'; scope: TeacherScope };

type Arrived = { window: ThreadDeltaWindow; stamped: boolean };
type StampInput = { q: ThreadDeltaQuery; caller: DeltaCaller; now: Date };

const windowOf = (v: ThreadView, unread: number): ThreadDeltaWindow => ({
  last_inbound_at: v.last_inbound_at,
  session_open: v.session_open,
  unread_count: unread,
  reply_line: v.reply_line ?? null,
  last_inbound_line: v.last_inbound_line ?? null,
  last_chat_inbound_at: v.last_chat_inbound_at ?? null,
  last_notifications_inbound_at: v.last_notifications_inbound_at ?? null,
});

const readNow = (views: MessageView[], at: Date): MessageView[] =>
  views.map((m) => (m.direction === 'inbound' && !m.read_at ? { ...m, read_at: at.toISOString() } : m));

/**
 * The open chat's periodic refresh (owner 2026-10-27): rows newer than `after` (and up to
 * DELTA_OVERLAP_MS before it: WhatsApp's own second can land there; clients merge by id) plus the
 * outgoing rows still moving — two reads side by side. Writes nothing unless a new inbound row
 * arrived: then the read stamp of opening the chat (admin / sales: only unread rows, Meta's receipt in
 * the background; teacher: their own teacher_thread_reads) and one thread read for the window.
 */
@Injectable()
export class ThreadDeltaService {
  /** Property-injected (the constructor is at the 3-parameter limit). */
  @Inject(ReadReceipts) private readonly receipts?: ReadReceipts;
  @Inject(TeacherThreadsQueries) private readonly teacher?: TeacherThreadsQueries;

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly delta: DeltaQueries,
    private readonly views: MessageViews,
  ) {}

  async read(q: ThreadDeltaQuery, caller: DeltaCaller, now = new Date()): Promise<ThreadDelta> {
    if (caller.kind === 'teacher') assertPhone(caller.scope, q.phone);
    const from = new Date(Date.parse(q.after) - DELTA_OVERLAP_MS).toISOString();
    const since = new Date(now.getTime() - PENDING_WINDOW_MS).toISOString();
    const [rows, moving] = await Promise.all([
      this.delta.newer({ phone: q.phone, after: from, limit: q.limit }),
      this.delta.pending({ phone: q.phone, ids: q.pending, since }),
    ]);
    const fresh = rows.slice(0, q.limit).reverse();
    const shown = new Set(fresh.map((r) => r.id));
    const [messages, pending, arrived] = await Promise.all([
      this.render(fresh, caller),
      this.render(moving.filter((r) => !shown.has(r.id)), caller),
      this.arrived(fresh, { q, caller, now }),
    ]);
    const out: ThreadDelta = { messages, has_more: rows.length > q.limit, pending };
    if (!arrived) return out;
    return { ...out, thread: arrived.window, messages: arrived.stamped ? readNow(messages, now) : messages };
  }

  private render(rows: readonly ThreadMessageRow[], caller: DeltaCaller): Promise<MessageView[]> {
    if (caller.kind !== 'sales') return Promise.all(rows.map((r) => this.views.view(r)));
    return Promise.all(rows.filter(visibleToSales).map(async (r) => withoutLinks(await this.views.view(r))));
  }

  /** A new inbound row (created after `after`), or one still unread: the stamp and the window; else nothing. */
  private async arrived(fresh: readonly ThreadMessageRow[], input: StampInput): Promise<Arrived | undefined> {
    const { q, caller, now } = input;
    const inbound = fresh.filter((r) => r.direction === 'inbound');
    const after = Date.parse(q.after);
    const news = inbound.some((r) => Date.parse(r.created_at) > after);
    const unread = caller.kind !== 'teacher' && inbound.some((r) => !r.read_at);
    if (!news && !unread) return undefined;
    const [row, stamped] = await Promise.all([this.queries.thread(q.phone), this.stamp({ inbound, news, unread }, input)]);
    if (!row) return undefined;
    const view = toThreadView(row, now, null);
    return { window: windowOf(view, caller.kind === 'teacher' || stamped ? 0 : view.unread_count), stamped };
  }

  /** Teacher: their own read mark on a new row. Admin / sales: the unread rows, as opening the chat. */
  private async stamp(seen: { inbound: readonly ThreadMessageRow[]; news: boolean; unread: boolean }, input: StampInput): Promise<boolean> {
    const { q, caller, now } = input;
    if (caller.kind === 'teacher') {
      if (seen.news) await this.need(this.teacher).stampRead({ teacherId: caller.scope.teacherId, phone: q.phone, at: now });
      return false;
    }
    if (!seen.unread) return false;
    return (await this.need(this.receipts).open(q.phone, { now, upTo: seen.inbound.at(-1)?.created_at })).stamped;
  }

  private need<T>(dep: T | undefined): T {
    if (!dep) throw new ForbiddenException();
    return dep;
  }
}
