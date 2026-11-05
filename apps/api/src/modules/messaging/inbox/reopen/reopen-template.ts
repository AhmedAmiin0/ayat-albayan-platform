import type { ReopenTemplateOutcome } from '@ab/shared';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { SalesScope } from '@/modules/sales/sales/sales-scope';
import { REOPEN_LIFE_MS, reopenUsable } from '@/modules/messaging/whatsapp';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import type { TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import type { Sent } from '@/modules/messaging/inbox/send/outbox';
import { ThreadSendService } from '@/modules/messaging/inbox/send/thread-send.service';
import type { ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { last4 } from './kapso-reopener';
import { ReopenRepo } from './reopen.repo';
import { reopenParams } from './reopen-params';

/** The outcome, and the row when one was sent through the outbox (the controller audits it). */
export interface Queued {
  outcome: ReopenTemplateOutcome;
  sent?: Sent;
}

interface ReopenSend {
  phone: string;
  thread: ThreadRow | null;
  actorId: string;
  scope: TeacherScope | null;
  sales: SalesScope | null;
  now: Date;
}

/**
 * The reopen template, the `chat_reopen_template` setting (owner 2026-11-03: welcome_greeting, and
 * no fallback: while the registry has it not approved on the thread's line, template_unavailable and nothing queued; once the
 * template sync brings it approved, this same path queues it), through the composer's own path,
 * ThreadSendService.template (approved, allow-list, params, its line), then the Outbox: the send gate
 * and the sender decide as for any send. `created_by` = the staff member (a staff send, not a job's).
 * Once per phone per 24 h: a reopen pending or sent since counts, a failed or expired one does not
 * (ReopenRepo.nextKey, its dedup key per day and try). The row expires after 24 h, as the sender's.
 */
@Injectable()
export class ReopenTemplate {
  private readonly log = new Logger('ReopenTemplate');

  constructor(
    private readonly sends: ThreadSendService,
    private readonly templates: TemplateRegistry,
    private readonly reopens: ReopenRepo,
  ) {}

  async queue(r: ReopenSend): Promise<Queued> {
    const key = await this.reopens.templateKey();
    const dedup = await this.reopens.nextKey(r.phone, r.now);
    if (!dedup) return { outcome: 'already_requested_today' };
    const template = await this.templates.approved(key);
    // Owner 2026-11-03: only an approved chat-line starter with no variables (reopenUsable).
    if (!template || !reopenUsable(template) || !onThreadLine(template.line, r.thread)) {
      this.log.log(`reopen template ${key} not approved on the thread's line yet: Kapso reopen only for ${last4(r.phone)}`);
      return { outcome: 'template_unavailable' };
    }
    try {
      const sent = await this.sends.template({
        phone: r.phone,
        input: { key, params: reopenParams(template, r.thread) },
        actorId: r.actorId,
        scope: r.scope,
        sales: r.sales,
        dedup,
        expiresAt: new Date(r.now.getTime() + REOPEN_LIFE_MS).toISOString(),
      });
      return sent.replayed ? { outcome: 'already_requested_today' } : { outcome: 'template_queued', sent };
    } catch (e) {
      // A refusal of the send path (missing_params, not allowed, …): nothing queued, the open still answers.
      if (e instanceof HttpException && e.getStatus() < 500) return this.skipped(r.phone, codeOf(e));
      throw e;
    }
  }

  /** Why, as an info line: ThreadReopenService logs the outcome's one warn line. */
  private skipped(phone: string, code: string): Queued {
    this.log.log(`reopen template not queued for ${last4(phone)}: ${code}`);
    return { outcome: 'not_sent' };
  }
}

/** The thread's line is the one its last inbound came on (unknown or the calls number: any line, the sender picks the template's). */
function onThreadLine(line: string, thread: ThreadRow | null): boolean {
  const last = thread?.last_inbound_line;
  return !last || last === 'calls' || last === line;
}

function codeOf(e: HttpException): string {
  const body = e.getResponse();
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return typeof code === 'string' ? code : String(e.getStatus());
}
