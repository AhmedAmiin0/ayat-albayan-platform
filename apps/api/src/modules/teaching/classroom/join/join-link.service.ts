import type { JoinLinkRequest, JoinLinkResult } from '@ab/schedule';
import { Injectable } from '@nestjs/common';
import { Outbox } from '@/modules/messaging/inbox/send/outbox';
import { notFound } from '@/common/http/errors';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { ClassroomRepo } from '@/modules/teaching/classroom/classroom.repo';
import { hashLinkToken, linkExpiry, newLinkToken } from './join-link.token';

export const JOIN_LINK_TEMPLATE = 'lesson_join_link';
const BUCKET_MS = 5 * 60_000;

/** An explicit admin send, never a job, so auto_messages_enabled is not read; 409 unapproved. */
@Injectable()
export class JoinLinkService {
  constructor(
    private readonly queries: ClassroomRepo,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  async send(
    input: { lessonId: string; body: JoinLinkRequest; actorId: string },
    now = new Date(),
  ): Promise<JoinLinkResult> {
    const { lessonId, body } = input;
    if (!(await this.templates.approved(JOIN_LINK_TEMPLATE))) throw waHttpError('template_not_approved', 409);
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const ctx = await this.queries.sendContext(lessonId, body.studentId);
    if (!ctx) throw notFound('student_not_in_lesson');
    const token = newLinkToken();
    const expires_at = linkExpiry(lesson, await this.queries.joinWindow());
    const sentFor = { sent_for_student_id: ctx.student.id };
    await this.queries.insertLink({
      lesson_id: lessonId,
      token_hash: hashLinkToken(token),
      expires_at,
      created_by: input.actorId,
      ...sentFor,
    });
    // ponytail: a double press inside five minutes replays the first message; its second link row
    // is simply never used and dies with the lesson window.
    const bucket = Math.floor(now.getTime() / BUCKET_MS);
    const sent = await this.outbox.send({
      phone_e164: ctx.guardian.phone,
      guardian_id: ctx.guardian.id,
      lesson_id: lessonId,
      template_key: JOIN_LINK_TEMPLATE,
      template_params: { '1': ctx.student.name, button: token },
      dedup_key: `${JOIN_LINK_TEMPLATE}:${lessonId}:${body.studentId}:${bucket}`,
      expires_at,
      created_by: input.actorId,
    });
    return { expires_at, replayed: sent.replayed, message_status: sent.view.status };
  }
}
