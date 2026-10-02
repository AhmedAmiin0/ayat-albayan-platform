import { sessionWindowOpen, type MessageView, type ThreadTemplate, type ThreadText } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { waHttpError } from '../whatsapp/template.mapper';
import { Outbox } from './outbox';
import { missingParams, type ThreadRow } from './threads.mapper';
import { ThreadsQueries } from './threads.queries';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
}

/** The row's people (by phone, like v_threads), author and idempotency key (rule 8). */
function outboundBase<T>(s: ThreadSend<T>, thread: ThreadRow | null) {
  return {
    phone_e164: s.phone,
    lead_id: thread?.lead_id ?? null,
    guardian_id: thread?.guardian_id ?? null,
    created_by: s.actorId,
    dedup_key: s.input.clientRequestId ? `admin:${s.input.clientRequestId}` : null,
  };
}

/** H3/H4 (docs/12 §4, R-LEAD-02): the admin writes from the inbox. */
@Injectable()
export class ThreadSendService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  /** H3: free text inside the 24 h window only (WhatsApp rejects it after: 131047). */
  async text(s: ThreadSend<ThreadText>, now = new Date()): Promise<MessageView> {
    const thread = await this.queries.thread(s.phone);
    if (!sessionWindowOpen(thread?.last_inbound_at, now)) throw waHttpError('session_closed', 409);
    return this.outbox.send({ ...outboundBase(s, thread), body: s.input.text });
  }

  /** H4: an approved template with every variable filled; a PDF template comes only from the PDF job. */
  async template(s: ThreadSend<ThreadTemplate>): Promise<MessageView> {
    const template = await this.templates.approved(s.input.key);
    if (!template) throw waHttpError('template_not_approved', 409);
    if (template.header_format === 'document') throw waHttpError('needs_document', 400);
    const missing = missingParams(template, s.input.params);
    if (missing.length) throw waHttpError('missing_params', 400, { missing });
    const thread = await this.queries.thread(s.phone);
    return this.outbox.send({
      ...outboundBase(s, thread),
      template_key: s.input.key,
      template_params: s.input.params,
      lesson_id: s.input.lessonId ?? null,
    });
  }
}
