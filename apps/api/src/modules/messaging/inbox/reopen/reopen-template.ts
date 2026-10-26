import { reopenDedupKey, type ReopenTemplateOutcome } from '@ab/shared';
import { HttpException, Injectable, Logger } from '@nestjs/common';
import type { SalesScope } from '../../../sales/sales/sales-scope';
import { TemplateRegistry } from '../../whatsapp/templates/catalog/template.registry';
import type { TeacherScope } from '../teacher-threads/teacher-scope';
import type { Sent } from '../send/outbox';
import { ThreadSendService } from '../send/thread-send.service';
import type { ThreadRow } from '../threads/threads.mapper';
import { last4 } from './kapso-reopener';
import { ReopenQueries } from './reopen.queries';
import { reopenParams } from './reopen-params';

const DAY_MS = 24 * 60 * 60_000;

/** The outcome, and the row when one was sent through the outbox (the controller audits it). */
export interface Queued {
  outcome: ReopenTemplateOutcome;
  sent?: Sent;
}

export interface ReopenSend {
  phone: string;
  thread: ThreadRow | null;
  actorId: string;
  scope: TeacherScope | null;
  sales: SalesScope | null;
  now: Date;
}

/**
 * The reopen template, the `chat_reopen_template` setting (owner 2026-10-26: inquiry_followup_ar_v2, and
 * no fallback: while the registry has it not approved on the thread's line, template_unavailable and nothing queued; once the
 * template sync brings it approved, this same path queues it), through the composer's own path,
 * ThreadSendService.template (approved, allow-list, params, its line), then the Outbox: the send gate
 * and the sender decide as for any send. `created_by` = the staff member (a staff send, not a job's).
 * Once per phone per 24 h (any reopen row since, or one still queued behind a closed gate, so days of
 * opens never pile up copies), and `reopen:<E.164>:<Riyadh day>` dedupes the row.
 */
@Injectable()
export class ReopenTemplate {
  private readonly log = new Logger('ReopenTemplate');

  constructor(
    private readonly sends: ThreadSendService,
    private readonly templates: TemplateRegistry,
    private readonly reopens: ReopenQueries,
  ) {}

  async queue(r: ReopenSend): Promise<Queued> {
    const key = await this.reopens.templateKey();
    if (await this.reopens.requestedSince(r.phone, new Date(r.now.getTime() - DAY_MS), key)) return { outcome: 'already_requested_today' };
    const template = await this.templates.approved(key);
    if (!template || !onThreadLine(template.line, r.thread)) {
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
        dedup: reopenDedupKey(r.phone, r.now),
      });
      return sent.replayed ? { outcome: 'already_requested_today' } : { outcome: 'template_queued', sent };
    } catch (e) {
      // A refusal of the send path (missing_params, not allowed, …): nothing queued, the open still answers.
      if (e instanceof HttpException && e.getStatus() < 500) return this.skipped(r.phone, codeOf(e));
      throw e;
    }
  }

  private skipped(phone: string, code: string): Queued {
    this.log.warn(`reopen template not queued for ${last4(phone)}: ${code}`);
    return { outcome: 'not_sent' };
  }
}

/** The thread's line is the one its last inbound came on (unknown: any line, the sender picks the template's). */
function onThreadLine(line: string, thread: ThreadRow | null): boolean {
  return !thread?.last_inbound_line || thread.last_inbound_line === line;
}

function codeOf(e: HttpException): string {
  const body = e.getResponse();
  const code = typeof body === 'object' && body !== null ? Reflect.get(body, 'code') : undefined;
  return typeof code === 'string' ? code : String(e.getStatus());
}
