import {
  restrictedMay,
  type TemplateView,
  type ThreadTemplate,
  type ThreadText,
} from '@ab/shared';
import { Inject, Injectable, Optional } from '@nestjs/common';
import { ReopenPick, TemplateRegistry, templateStamp } from '@/modules/messaging/whatsapp';
import { Outbox, type Sent } from './outbox';
import { assertCanSend, type TeacherScope } from '@/modules/messaging/inbox/teacher-threads/teacher-scope';
import { chatLine } from './text-line';
import { ThreadQuotes } from '@/modules/messaging/inbox/threads/thread-quotes';
import { assertSendableParams } from './template-params';
import { ThreadsRepo } from '@/modules/messaging/inbox/threads/threads.repo';
import { assertRepliesToOriginal, CorrectionRepo, correctionOf, withSameRequest } from './correction';
import { reopenFields, reopenStamp } from './reopen-send';
import { assertSentByHand, dedupKey, outboundBase, replyOf } from './thread-send';
import type { ThreadSend } from './thread-send.types';
import { httpError } from '@/common/http/errors';

export { chatLine, sendLine } from './text-line';
export { dedupKey, outboundBase, replyOf } from './thread-send';
export type { ThreadSend } from './thread-send.types';

/**
 * H3/H4 (docs/12 §4, R-LEAD-02): the admin, a salesperson (any chat, docs/16) — or, in teacher
 * mode, a teacher for their own families — writes from the inbox.
 */
@Injectable()
export class ThreadSendService {
  @Inject(ThreadQuotes) private readonly quotes?: ThreadQuotes; // The constructor is full.
  @Inject(CorrectionRepo) private readonly corrections?: CorrectionRepo;
  @Optional() @Inject(ReopenPick) private readonly reopens?: ReopenPick;

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
    if (again) return withSameRequest(again, s.input); // A correction retry's first row (#694).
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
   * H4: an approved template with every variable filled; a PDF template comes only from the PDF
   * job. A restricted role (teacher, sales, any role without templates.send_all) sends only the
   * allow-list: 403 template_not_allowed for any other. The sender picks the template's own line at
   * claim (docs/12 §13.3); a chat-line starter is stamped chat now (templateStamp), so the chat
   * lane sends it before the chat's next text (docs/42 42-7). `reopen` in a closed window: the
   * staff-picked reopen template (ReopenPick: the window hold's `reopen:` key, so no second one).
   */
  async template(s: ThreadSend<ThreadTemplate>, now = new Date()): Promise<Sent> {
    if (s.scope) await this.teacherMay(s.scope, s);
    const key = dedupKey(s);
    assertSentByHand(s.input.key);
    const template = await this.approved(s);
    const thread = await this.queries.thread(s.phone);
    const ask = { phone: s.phone, actorId: s.actorId, input: s.input, template, thread, now };
    const reopen = await reopenStamp(this.reopens, ask);
    return this.outbox.queue({
      ...outboundBase(s, thread),
      template_key: s.input.key,
      template_params: s.input.params,
      lesson_id: s.input.lessonId ?? null,
      ...templateStamp(template),
      ...reopenFields(reopen, key),
    });
  }

  private async approved(s: ThreadSend<ThreadTemplate>): Promise<TemplateView> {
    const template = await this.templates.approved(s.input.key);
    if (!template) throw httpError(409, 'template_not_approved');
    if (s.restricted && !restrictedMay(template)) throw httpError(403, 'template_not_allowed');
    if (template.header_format === 'document') throw httpError(400, 'needs_document');
    assertSendableParams(template, s.input.params);
    return template;
  }

  /**
   * A teacher: own families only, not their own chat, own lessons only (the allow-list is checked
   * after).
   */
  private async teacherMay(scope: TeacherScope, s: ThreadSend<ThreadTemplate>): Promise<void> {
    assertCanSend(scope, s.phone);
    const { lessonId } = s.input;
    if (lessonId && (await this.queries.lessonTeacher(lessonId)) !== scope.teacherId) {
      throw httpError(403, 'not_your_lesson');
    }
  }
}
