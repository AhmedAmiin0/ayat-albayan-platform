import { isTeacherTemplate, type ThreadTemplate, type ThreadText } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { lineEnvs, loadEnv } from '../../env';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { waHttpError } from '../whatsapp/template.mapper';
import { assertSalesPhone, type SalesScope } from '../sales/sales-scope';
import { Outbox, type Sent } from './outbox';
import { assertCanSend, type TeacherScope } from './teacher-scope';
import { missingParams, threadReplyLine, type ThreadRow } from './threads.mapper';
import { ThreadsQueries } from './threads.queries';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
  /** Teacher mode: the sending teacher's scope; null/absent = the admin. */
  scope?: TeacherScope | null;
  /** Sales mode: the sending salesperson's scope (their leads' and families' chats). */
  sales?: SalesScope | null;
}

/**
 * Rule 8: every inbox send carries the client's request id, so a retried POST (lost answer, double
 * tap) returns the first row instead of messaging the family twice. 400 without one. The key is scoped to who sends
 * and to whom (`teacher:<teacher>:<phone>:<id>`, `admin:<phone>:<id>`), so one id reused on another
 * phone, or by another teacher, is a new send, never the first family's row.
 */
function dedupKey<T>(s: ThreadSend<T>): string {
  if (!s.input.clientRequestId) throw waHttpError('missing_client_request_id', 400);
  const who = s.sales ? `sales:${s.sales.salesId}` : s.scope ? `teacher:${s.scope.teacherId}` : 'admin';
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
 * The line a session text leaves from (docs/12 §13.3 rule 2): replyLine() prefers the chat line
 * whenever its window is open. Every window closed → 409; only the chat window open while the chat
 * line cannot send → 503. Stamped only while the chat line is configured (13.2: a single line
 * queues no line key). The env is read per request.
 */
function sendLine(thread: ThreadRow | null, now: Date): { line?: 'chat' | 'notifications' } {
  const chatConfigured = Boolean(lineEnvs(loadEnv()).chat);
  const line = thread ? threadReplyLine(thread, { chatConfigured, now }) : null;
  if (!line) throw waHttpError('session_closed', 409);
  if (!chatConfigured) {
    if (line === 'chat') throw waHttpError('line_not_configured', 503);
    return {};
  }
  return { line };
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

  /**
   * H3: free text inside a 24 h window only (WhatsApp rejects it after: 131047), from the chat line
   * when its window is open, else from notifications (sendLine), decided before the enqueue.
   */
  async text(s: ThreadSend<ThreadText>, now = new Date()): Promise<Sent> {
    if (s.scope) assertCanSend(s.scope, s.phone);
    if (s.sales) assertSalesPhone(s.sales, s.phone);
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    return this.outbox.send({ ...outboundBase(s, thread), dedup_key: key, body: s.input.text, ...sendLine(thread, now) });
  }

  /**
   * H4: an approved template with every variable filled; a PDF template comes only from the PDF job.
   * No line stamp: templates always leave from the notifications line (the sender stamps at claim).
   */
  async template(s: ThreadSend<ThreadTemplate>): Promise<Sent> {
    if (s.scope) await this.teacherMay(s.scope, s);
    if (s.sales) await this.salesMay(s.sales, s);
    const key = dedupKey(s);
    // Its link is signed per lesson and student by «ابعت طلب الرأي» (FeedbackModule); a hand-made button is a dead link.
    if (s.input.key === 'lesson_feedback_request') throw waHttpError('use_feedback_request', 400);
    // Likewise «ابعت لينك الحلقة» (ClassroomModule) mints the one-lesson token.
    if (s.input.key === 'lesson_join_link') throw waHttpError('use_join_link', 400);
    // «إرسال تقييم الحلقة» picks the lesson and its date itself (rule 6) and sets the button payloads.
    if (s.input.key === 'lesson_rating') throw waHttpError('use_rating_button', 400);
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

  /** A salesperson: their leads' and families' chats only, and only lessons in their scope. */
  private async salesMay(sales: SalesScope, s: ThreadSend<ThreadTemplate>): Promise<void> {
    assertSalesPhone(sales, s.phone);
    if (s.input.lessonId && !(await this.queries.salesOwnsLesson(sales.salesId, s.input.lessonId))) {
      throw waHttpError('not_your_lesson', 403);
    }
  }
}
