import { isTeacherTemplate, sessionWindowOpen, type ThreadTemplate, type ThreadText } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { waHttpError } from '../whatsapp/template.mapper';
import { Outbox, type Sent } from './outbox';
import { assertCanSend, type TeacherScope } from './teacher-scope';
import { missingParams, type ThreadRow } from './threads.mapper';
import { ThreadsQueries } from './threads.queries';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
  /** Teacher mode: the sending teacher's scope; null/absent = the admin. */
  scope?: TeacherScope | null;
}

/**
 * Rule 8: every inbox send carries the client's request id, so a retried POST (lost answer, double
 * tap) returns the first row instead of messaging the family twice. 400 without one. The key is scoped to who sends
 * and to whom (`teacher:<teacher>:<phone>:<id>`, `admin:<phone>:<id>`), so one id reused on another
 * phone, or by another teacher, is a new send, never the first family's row.
 */
function dedupKey<T>(s: ThreadSend<T>): string {
  if (!s.input.clientRequestId) throw waHttpError('missing_client_request_id', 400);
  const who = s.scope ? `teacher:${s.scope.teacherId}` : 'admin';
  return `${who}:${s.phone}:${s.input.clientRequestId}`;
}

/** The row's people (by phone, like v_threads) and author; a teacher's row names them («بعتها»). */
function outboundBase<T>(s: ThreadSend<T>, thread: ThreadRow | null) {
  return {
    phone_e164: s.phone,
    lead_id: thread?.lead_id ?? null,
    guardian_id: thread?.guardian_id ?? null,
    created_by: s.actorId,
    sent_by_teacher_id: s.scope?.teacherId ?? null,
  };
}

/**
 * H3/H4 (docs/12 §4, R-LEAD-02): the admin — or, in teacher mode, a teacher for their own families
 * (owner decision 2026-10-02) — writes from the inbox, from the academy number.
 */
@Injectable()
export class ThreadSendService {
  constructor(
    private readonly queries: ThreadsQueries,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  /** H3: free text inside the 24 h window only (WhatsApp rejects it after: 131047). */
  async text(s: ThreadSend<ThreadText>, now = new Date()): Promise<Sent> {
    if (s.scope) assertCanSend(s.scope, s.phone);
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    if (!sessionWindowOpen(thread?.last_inbound_at, now)) throw waHttpError('session_closed', 409);
    return this.outbox.send({ ...outboundBase(s, thread), dedup_key: key, body: s.input.text });
  }

  /** H4: an approved template with every variable filled; a PDF template comes only from the PDF job. */
  async template(s: ThreadSend<ThreadTemplate>): Promise<Sent> {
    if (s.scope) await this.teacherMay(s.scope, s);
    const key = dedupKey(s);
    const template = await this.templates.approved(s.input.key);
    if (!template) throw waHttpError('template_not_approved', 409);
    if (template.header_format === 'document') throw waHttpError('needs_document', 400);
    const missing = missingParams(template, s.input.params);
    if (missing.length) throw waHttpError('missing_params', 400, { missing });
    const thread = await this.queries.thread(s.phone);
    return this.outbox.send({
      ...outboundBase(s, thread),
      dedup_key: key,
      template_key: s.input.key,
      template_params: s.input.params,
      lesson_id: s.input.lessonId ?? null,
    });
  }

  /** A teacher: own families only, not their own chat, reminder templates only, own lessons only. */
  private async teacherMay(scope: TeacherScope, s: ThreadSend<ThreadTemplate>): Promise<void> {
    assertCanSend(scope, s.phone);
    if (!isTeacherTemplate(s.input.key)) throw waHttpError('template_not_allowed', 403);
    if (s.input.lessonId && (await this.queries.lessonTeacher(s.input.lessonId)) !== scope.teacherId) {
      throw waHttpError('not_your_lesson', 403);
    }
  }
}
