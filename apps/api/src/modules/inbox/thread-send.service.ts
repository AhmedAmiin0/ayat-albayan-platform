import { restrictedMay, type ThreadTemplate, type ThreadText, type WaLine } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { TemplateRegistry } from '../whatsapp/templates/catalog/template.registry';
import { waHttpError } from '../whatsapp/templates/catalog/template.mapper';
import type { SalesScope } from '../sales/sales-scope';
import { Outbox, type Sent } from './outbox';
import { assertCanSend, type TeacherScope } from './teacher-scope';
import { pickSend, type ThreadWindow } from './send-number';
import { ThreadQuotes, type ReplyFields, type SendFrom } from './thread-quotes';
import { missingParams, type ThreadRow } from './threads.mapper';
import { ThreadsQueries } from './threads.queries';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
  /** Teacher mode: the sending teacher's scope; null/absent = the admin. */
  scope?: TeacherScope | null;
  /** Sales mode: the sending salesperson (any chat, her own dedup space and audit). */
  sales?: SalesScope | null;
  /**
   * Neither templates.manage nor templates.send_all (owner 2026-10-12): only the restricted allow-list
   * (restrictedMay, like GET /messaging/templates). Absent = every template (the admin).
   */
  restricted?: boolean;
  /** «إعادة توجيه»: the message this copy was forwarded from (messages.forwarded_from_id). */
  forwardedFrom?: string;
}

/**
 * Rule 8: every inbox send carries the client's request id, so a retried POST (lost answer, double
 * tap) returns the first row instead of messaging the family twice. 400 without one. The key is scoped to who sends
 * and to whom (`teacher:<teacher>:<phone>:<id>`, `admin:<phone>:<id>`), so one id reused on another
 * phone, or by another teacher, is a new send, never the first family's row.
 */
export function dedupKey<T>(s: ThreadSend<T>): string {
  if (!s.input.clientRequestId) throw waHttpError('missing_client_request_id', 400);
  const who = s.sales ? `sales:${s.sales.salesId}` : s.scope ? `teacher:${s.scope.teacherId}` : 'admin';
  return `${who}:${s.phone}:${s.input.clientRequestId}`;
}

/** The row's people (by phone, like v_threads) and author; a teacher's row names them («بعتها»). */
export function outboundBase<T>(s: ThreadSend<T>, thread: ThreadRow | null) {
  return {
    phone_e164: s.phone,
    lead_id: thread?.lead_id ?? null,
    guardian_id: thread?.guardian_id ?? null,
    created_by: s.actorId,
    sent_by_teacher_id: s.scope?.teacherId ?? null,
    ...(s.forwardedFrom ? { forwarded_from_id: s.forwardedFrom } : {}),
  };
}

/** «رد»: the quoted message's id and wamid, resolved in this chat only (ThreadQuotes.target); none = {}. */
export async function replyOf(
  quotes: ThreadQuotes | undefined,
  s: ThreadSend<{ replyToMessageId?: string | undefined }>,
  from: SendFrom,
): Promise<ReplyFields | Record<string, never>> {
  if (!s.input.replyToMessageId) return {};
  if (!quotes) throw new Error('ThreadQuotes is not provided');
  return quotes.target(s.phone, s.input.replyToMessageId, from);
}

/**
 * pickSend as the inbox answers it: 409 session_closed (no thread too), 503 line_not_configured. Legacy:
 * pickSendLine's { line? }; module mode (docs/23c decision 6): { number_id, line } from the reply windows,
 * which `windows` reads (module mode only).
 */
export async function sendLine(
  thread: ThreadRow | null,
  at: { now: Date; windows: () => Promise<readonly ThreadWindow[]> },
): Promise<{ line?: WaLine; number_id?: string }> {
  const picked = await pickSend({ thread, now: at.now, windows: at.windows });
  if (!('code' in picked)) return picked;
  throw picked.code === 'line_not_configured' ? waHttpError('line_not_configured', 503) : waHttpError('session_closed', 409);
}

/**
 * H3/H4 (docs/12 §4, R-LEAD-02): the admin, a salesperson (any chat, docs/16) — or, in teacher mode,
 * a teacher for their own families (owner decision 2026-10-02) — writes from the inbox.
 */
@Injectable()
export class ThreadSendService {
  /** «رد» (property-injected: the constructor is at the 3-parameter limit). */
  @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes;

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
    const key = dedupKey(s);
    const thread = await this.queries.thread(s.phone);
    const from = await sendLine(thread, { now, windows: () => this.queries.numberWindows(s.phone) });
    const reply = await replyOf(this.quotes, s, from);
    return this.outbox.send({ ...outboundBase(s, thread), dedup_key: key, body: s.input.text, ...from, ...reply });
  }

  /**
   * H4: an approved template with every variable filled; a PDF template comes only from the PDF job.
   * A restricted role (teacher, sales, any role without templates.send_all) sends only the allow-list
   * (owner 2026-10-12): 403 template_not_allowed for any other. No line stamp here: the
   * sender picks the template's own line and stamps it at claim (docs/12 §13.3).
   */
  async template(s: ThreadSend<ThreadTemplate>): Promise<Sent> {
    if (s.scope) await this.teacherMay(s.scope, s);
    const key = dedupKey(s);
    // Its link is signed per lesson and student by «ابعت طلب الرأي» (FeedbackModule); a hand-made button is a dead link.
    if (s.input.key === 'lesson_feedback_request') throw waHttpError('use_feedback_request', 400);
    // Likewise «ابعت لينك الحلقة» (ClassroomModule) mints the one-lesson token.
    if (s.input.key === 'lesson_join_link') throw waHttpError('use_join_link', 400);
    // «إرسال تقييم الحلقة» picks the lesson and its date itself (rule 6) and sets the button payloads.
    if (s.input.key === 'lesson_rating') throw waHttpError('use_rating_button', 400);
    const template = await this.templates.approved(s.input.key);
    if (!template) throw waHttpError('template_not_approved', 409);
    if (s.restricted && !restrictedMay(template)) throw waHttpError('template_not_allowed', 403);
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

  /** A teacher: own families only, not their own chat, own lessons only (the allow-list is checked after). */
  private async teacherMay(scope: TeacherScope, s: ThreadSend<ThreadTemplate>): Promise<void> {
    assertCanSend(scope, s.phone);
    if (s.input.lessonId && (await this.queries.lessonTeacher(s.input.lessonId)) !== scope.teacherId) {
      throw waHttpError('not_your_lesson', 403);
    }
  }
}
