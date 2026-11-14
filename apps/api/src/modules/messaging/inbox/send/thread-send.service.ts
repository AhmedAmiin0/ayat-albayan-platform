import { ACCOUNT_CODE_TEMPLATE, restrictedMay, type ThreadTemplate, type ThreadText } from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { ReopenPick, templateStamp } from '@/modules/messaging/whatsapp';
import type { SalesScope } from '@/modules/sales/sales/sales-scope';
import { Outbox, type Sent } from './outbox';
import { assertCanSend, type TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { chatLine } from './text-line';
import { ThreadQuotes, type ReplyFields, type SendFrom } from '@/modules/messaging/inbox/threads/thread-quotes';
import { missingParams, type ThreadRow } from '@/modules/messaging/inbox/threads/threads.mapper';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { assertRepliesToOriginal, CorrectionRepo, correctionOf, withSameRequest } from './correction';
import { reopenStamp } from './reopen-send';

export { chatLine, sendLine } from './text-line';

export interface ThreadSend<T> {
  phone: string;
  input: T & { clientRequestId?: string | undefined };
  actorId: string;
  /** Teacher mode: the sending teacher's scope; null/absent = the admin. */
  scope?: TeacherScope | null;
  /** Sales mode: the sending salesperson (any chat, her own dedup space and audit). */
  sales?: SalesScope | null;
  /** No templates.send_all (owner 2026-10-12): the allow-list only (restrictedMay); absent: all. */
  restricted?: boolean;
  /** «إعادة توجيه»: the message this copy was forwarded from (messages.forwarded_from_id). */
  forwardedFrom?: string;
  role?: string | null; // the sender's base role («تعديل»: an admin corrects anyone's text)
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
 * H3/H4 (docs/12 §4, R-LEAD-02): the admin, a salesperson (any chat, docs/16) — or, in teacher mode,
 * a teacher for their own families (owner decision 2026-10-02) — writes from the inbox.
 */
@Injectable()
export class ThreadSendService {
  @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes; // «رد» (the constructor is full)
  @Inject(CorrectionRepo) private readonly corrections?: CorrectionRepo; // «تعديل» = a correction
  @Optional() @Inject(ReopenPick) private readonly reopens?: ReopenPick; // «إعادة فتح المحادثة»

  constructor(
    private readonly queries: ThreadsRepo,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  /**
   * H3: free text from the chat line (window open) or notifications; after every window it is held
   * behind the reopen template (chatLine, 2026-11-03). Teacher mode keeps 409 (sendLine).
   */
  async text(s: ThreadSend<ThreadText>, now = new Date()): Promise<Sent> {
    if (s.scope) assertCanSend(s.scope, s.phone);
    const key = dedupKey(s);
    const again = s.input.correctsId ? await this.outbox.replayOf(key) : null;
    if (again) return withSameRequest(again, s.input); // «تعديل»: a retry's first row (#694)
    const thread = await this.queries.thread(s.phone);
    const at = { now, windows: () => this.queries.numberWindows(s.phone) };
    const fix = await correctionOf(this.corrections, s);
    const from = await chatLine(thread, { ...at, teacher: !!s.scope });
    const reply = await replyOf(this.quotes, fix.send, from);
    assertRepliesToOriginal(fix.row.corrects_id, reply);
    const body = fix.send.input.text;
    const row = { ...outboundBase(s, thread), dedup_key: key, body, ...from, ...reply };
    return withSameRequest(await this.outbox.queue({ ...row, ...fix.row }), s.input);
  }

  /**
   * H4: an approved template with every variable filled; a PDF template comes only from the PDF job.
   * A restricted role (teacher, sales, any role without templates.send_all) sends only the allow-list
   * (owner 2026-10-12): 403 template_not_allowed for any other. The sender picks the template's own
   * line at claim (docs/12 §13.3); a chat-line starter is stamped chat now (templateStamp), so the
   * chat lane sends it before the chat's next text (docs/42 42-7). `reopen` in a closed window: the
   * staff-picked reopen template (ReopenPick: the window hold's `reopen:` key, so no second one).
   */
  async template(s: ThreadSend<ThreadTemplate>, now = new Date()): Promise<Sent> {
    if (s.scope) await this.teacherMay(s.scope, s);
    const key = dedupKey(s);
    // Its link is signed per lesson and student by «ابعت طلب الرأي» (FeedbackModule); a hand-made button is a dead link.
    if (s.input.key === 'lesson_feedback_request') throw waHttpError('use_feedback_request', 400);
    // Likewise «ابعت لينك الحلقة» (ClassroomModule) mints the one-lesson token.
    if (s.input.key === 'lesson_join_link') throw waHttpError('use_join_link', 400);
    // «إرسال تقييم الحلقة» picks the lesson and its date itself (rule 6) and sets the button payloads.
    if (s.input.key === 'lesson_rating') throw waHttpError('use_rating_button', 400);
    // The sign-in code (docs/30) is only ever sent by the API itself, never typed by hand.
    if (s.input.key === ACCOUNT_CODE_TEMPLATE) throw waHttpError('template_not_allowed', 403);
    const template = await this.templates.approved(s.input.key);
    if (!template) throw waHttpError('template_not_approved', 409);
    if (s.restricted && !restrictedMay(template)) throw waHttpError('template_not_allowed', 403);
    if (template.header_format === 'document') throw waHttpError('needs_document', 400);
    const missing = missingParams(template, s.input.params);
    if (missing.length) throw waHttpError('missing_params', 400, { missing });
    const thread = await this.queries.thread(s.phone);
    const ask = { phone: s.phone, input: s.input, template, thread, now };
    const reopen = await reopenStamp(this.reopens, ask);
    return this.outbox.queue({
      ...outboundBase(s, thread),
      dedup_key: reopen?.dedup ?? key,
      template_key: s.input.key,
      template_params: s.input.params,
      lesson_id: s.input.lessonId ?? null,
      ...templateStamp(template),
      ...(reopen ? { expires_at: reopen.expiresAt } : {}),
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
