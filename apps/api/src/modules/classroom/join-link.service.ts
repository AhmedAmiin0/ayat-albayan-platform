import type { JoinLinkRequest, JoinLinkResult } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { Outbox } from '../inbox/outbox';
import { notFound } from '../scheduling/errors';
import { waHttpError } from '../whatsapp/template.mapper';
import { TemplateRegistry } from '../whatsapp/template.registry';
import { ClassroomQueries } from './classroom.queries';
import { hashLinkToken, linkExpiry, newLinkToken } from './join-link.token';

export const JOIN_LINK_TEMPLATE = 'lesson_join_link';
const BUCKET_MS = 5 * 60_000;

/**
 * POST /lessons/:id/join-link («ابعت لينك الحلقة»): an explicit admin send, never a job, so
 * settings.auto_messages_enabled is not read, and the template is never submitted to Meta from
 * here (409 template_not_approved until the admin has submitted it and Meta approved it). The
 * message goes through the same Outbox as every inbox template.
 */
@Injectable()
export class JoinLinkService {
  constructor(
    private readonly queries: ClassroomQueries,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  async send(input: { lessonId: string; body: JoinLinkRequest; actorId: string }, now = new Date()): Promise<JoinLinkResult> {
    const { lessonId, body } = input;
    if (!(await this.templates.approved(JOIN_LINK_TEMPLATE))) throw waHttpError('template_not_approved', 409);
    const lesson = await this.queries.lesson(lessonId);
    if (!lesson) throw notFound('lesson_not_found');
    const ctx = await this.queries.sendContext(lessonId, body.studentId);
    if (!ctx) throw notFound('student_not_in_lesson');
    const token = newLinkToken();
    const expires_at = linkExpiry(lesson);
    await this.queries.insertLink({ lesson_id: lessonId, token_hash: hashLinkToken(token), expires_at, created_by: input.actorId });
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
