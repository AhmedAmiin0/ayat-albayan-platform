import type { ThreadReopenView } from '@ab/shared';
import { Injectable, Logger } from '@nestjs/common';
import type { SalesScope } from '../../../sales/sales/sales-scope';
import { assertCanSend, type TeacherScope } from '../teacher-threads/teacher-scope';
import { messagingWindowOpen } from '../threads/threads.mapper';
import { ThreadsQueries } from '../threads/threads.queries';
import { KapsoReopener, last4 } from './kapso-reopener';
import type { Sent } from '../send/outbox';
import { ReopenTemplate, type Queued } from './reopen-template';

interface ReopenRequest {
  phone: string;
  actorId: string;
  /** Teacher mode: the teacher's scope (own families only, like a send). */
  scope: TeacherScope | null;
  sales: SalesScope | null;
  /** No templates.send_all (teachers, sales, assistants): Kapso's record only, never the template (owner 2026-10-12). */
  restricted: boolean;
}

type Reopened = { view: ThreadReopenView; sent?: Sent };

/**
 * «إعادة فتح المحادثة» (owner 2026-10-26): a staff member opened a thread whose 24 h window is closed.
 * (a) Kapso's conversation record back to active (chat line on kapso; bounded and never failing) and
 * (b) the reopen template, queued once a day (ReopenTemplate), run side by side (owner 2026-10-27: a
 * slow or failing Kapso never holds the template). An open window, or a phone with no thread yet, does
 * nothing. Every outcome but template_queued logs one warn line (the phone's last 4 digits only).
 * `sent` = the queued row, for the controller's audit.
 */
@Injectable()
export class ThreadReopenService {
  private readonly log = new Logger('ThreadReopen');

  constructor(
    private readonly queries: ThreadsQueries,
    private readonly kapso: KapsoReopener,
    private readonly template: ReopenTemplate,
  ) {}

  async reopen(r: ReopenRequest, now = new Date()): Promise<Reopened> {
    try {
      const out = await this.run(r, now);
      if (out.view.template !== 'template_queued') this.warn(r.phone, out.view.template);
      return out;
    } catch (e) {
      this.warn(r.phone, 'failed');
      throw e;
    }
  }

  private async run(r: ReopenRequest, now: Date): Promise<Reopened> {
    if (r.scope) assertCanSend(r.scope, r.phone);
    const thread = await this.queries.thread(r.phone);
    if (!thread) return { view: { kapso_reopened: false, template: 'not_sent' } };
    if (messagingWindowOpen(thread, now)) return { view: { kapso_reopened: false, template: 'window_open' } };
    const kapso = this.kapso.reopen(r.phone);
    const queued: Promise<Queued> = r.restricted
      ? Promise.resolve({ outcome: 'not_allowed' })
      : this.template.queue({ phone: r.phone, thread, actorId: r.actorId, scope: r.scope, sales: r.sales, now });
    const [kapso_reopened, q] = await Promise.all([kapso, queued]);
    return { view: { kapso_reopened, template: q.outcome }, ...(q.sent ? { sent: q.sent } : {}) };
  }

  private warn(phone: string, outcome: string): void {
    this.log.warn(`reopen for ${last4(phone)}: ${outcome}`);
  }
}
