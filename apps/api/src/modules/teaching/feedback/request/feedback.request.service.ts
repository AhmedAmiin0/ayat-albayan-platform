import { feedbackEligible, type FeedbackRequest, type FeedbackRequestResult } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import { FEEDBACK_CONFIG, type FeedbackConfig } from '@/modules/teaching/feedback/feedback.config';
import { FeedbackRepo, type FeedbackRow, type RequestContext } from '@/modules/teaching/feedback/feedback.repo';
import { FEEDBACK_TEMPLATE, FeedbackSender } from './feedback.sender';
import { hashToken, signToken } from '@/modules/teaching/feedback/public/feedback.token';
import { issueLink } from '@/modules/teaching/feedback/links/feedback.links';

type RequestInput = { lessonId: string; body: FeedbackRequest; actorId: string };
type Link = { row: FeedbackRow; token: string; exp: number };

/**
 * POST /lessons/:id/feedback-request («ابعت طلب الرأي»): an explicit admin send, never a job, so
 * settings.auto_messages_enabled is not read. The message goes through the Outbox like any inbox
 * template; its dedup key carries the link's expiry, so a second press while the link is alive is a
 * replay (nothing new is sent) and a resend with a new link is a new message.
 */
@Injectable()
export class FeedbackRequestService {
  constructor(
    private readonly queries: FeedbackRepo,
    private readonly sender: FeedbackSender,
    @Inject(FEEDBACK_CONFIG) private readonly config: FeedbackConfig,
  ) {}

  async request(input: RequestInput, now = new Date()): Promise<FeedbackRequestResult> {
    const { lessonId, body } = input;
    if (!this.config.secret) throw waHttpError('not_configured', 503);
    await this.sender.assertApproved();
    const ctx = await this.queries.requestContext(lessonId, body.studentId);
    if (!ctx) throw notFound('student_not_in_lesson');
    if (!feedbackEligible(ctx.lessonStatus, ctx.attendance)) throw conflict('lesson_not_eligible');
    const resend = body.resend === true;
    const link = await this.link({ lessonId, ctx, resend, secret: this.config.secret }, now);
    const sent = await this.sender.send({
      phone_e164: ctx.guardian.phone,
      guardian_id: ctx.guardian.id,
      lesson_id: lessonId,
      template_params: { '1': ctx.student.name, '2': ctx.teacher.name, button: link.token },
      dedup_key: `${FEEDBACK_TEMPLATE}:${lessonId}:${body.studentId}:${link.exp}`,
      expires_at: link.row.expires_at,
      created_by: input.actorId,
    });
    return {
      requested_at: link.row.requested_at,
      expires_at: link.row.expires_at,
      replayed: sent.replayed,
      message_status: sent.view.status,
    };
  }

  /** The live link of an unanswered row is rebuilt (same HMAC), else a new one replaces it. */
  private async link(
    input: { lessonId: string; ctx: RequestContext; resend: boolean; secret: string },
    now: Date,
  ): Promise<Link> {
    const { lessonId, ctx, secret } = input;
    const existing = await this.queries.find(lessonId, ctx.student.id);
    if (existing?.submitted_at) throw conflict('already_submitted');
    if (existing && !input.resend && Date.parse(existing.expires_at) > now.getTime()) {
      const exp = Math.floor(Date.parse(existing.expires_at) / 1000);
      const token = signToken(secret, { lessonId, studentId: ctx.student.id, exp });
      if (hashToken(token) === existing.token_hash) return { row: existing, token, exp };
    }
    const pair = { lessonId, studentId: ctx.student.id };
    const made = await issueLink(this.queries, { secret, pair, ctx }, now);
    if (!made) throw conflict('already_submitted');
    return made;
  }
}
