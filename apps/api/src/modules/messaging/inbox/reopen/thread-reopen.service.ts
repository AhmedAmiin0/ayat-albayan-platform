import { sessionWindowOpen, type ThreadReopenView } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import type { SalesScope } from '../../../sales/sales/sales-scope';
import { assertCanSend, type TeacherScope } from '../teacher-threads/teacher-scope';
import { ThreadsQueries } from '../threads/threads.queries';
import { KapsoReopener } from './kapso-reopener';
import type { Sent } from '../send/outbox';
import { ReopenTemplate } from './reopen-template';

interface ReopenRequest {
  phone: string;
  actorId: string;
  /** Teacher mode: the teacher's scope (own families only, like a send). */
  scope: TeacherScope | null;
  sales: SalesScope | null;
  /** No templates.send_all (teachers, sales, assistants): Kapso's record only, never the template (owner 2026-10-12). */
  restricted: boolean;
}

/**
 * «إعادة فتح المحادثة» (owner 2026-10-26): a staff member opened a thread whose 24 h window is closed.
 * (a) Kapso's conversation record back to active (chat line on kapso; a failure never fails this);
 * (b) the reopen template, queued once a day (ReopenTemplate). An open window, or a phone with no
 * thread yet, does nothing. `sent` = the queued row, for the controller's audit.
 */
@Injectable()
export class ThreadReopenService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly kapso: KapsoReopener,
    private readonly template: ReopenTemplate,
  ) {}

  async reopen(r: ReopenRequest, now = new Date()): Promise<{ view: ThreadReopenView; sent?: Sent }> {
    if (r.scope) assertCanSend(r.scope, r.phone);
    const thread = await this.queries.thread(r.phone);
    if (!thread) return { view: { kapso_reopened: false, template: 'not_sent' } };
    if (sessionWindowOpen(thread.last_inbound_at, now)) return { view: { kapso_reopened: false, template: 'window_open' } };
    const kapso_reopened = await this.kapso.reopen(r.phone);
    if (r.restricted) return { view: { kapso_reopened, template: 'not_allowed' } };
    const queued = await this.template.queue({ phone: r.phone, thread, actorId: r.actorId, scope: r.scope, sales: r.sales, now });
    return { view: { kapso_reopened, template: queued.outcome }, ...(queued.sent ? { sent: queued.sent } : {}) };
  }
}
