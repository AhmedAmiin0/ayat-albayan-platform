import { feedbackSubmitSchema, type FeedbackFormView } from '@ab/shared';
import { GoneException, Inject, Injectable } from '@nestjs/common';
import { conflict, notFound } from '@/common/http/errors';
import { parseOrThrow } from '@/common/http/http';
import { FEEDBACK_CONFIG, type FeedbackConfig } from '@/modules/teaching/feedback/feedback.config';
import { answerOf, toFormView } from '@/modules/teaching/feedback/feedback.mapper';
import { FeedbackRepo, type PublicContext } from '@/modules/teaching/feedback/feedback.repo';
import { PublicFeedbackLimit } from './feedback.rate-limit';
import { hashToken, verifyToken, type TokenPayload } from './feedback.token';

type PublicCall = { token: string; ip: string };

const expired = () => new GoneException({ code: 'feedback_expired', message: 'feedback_expired' });
const invalid = () => notFound('feedback_not_found');

/**
 * The family's side of «رأيك يهمّنا» (no login): GET prefill and POST once. A wrong, tampered or
 * revoked (replaced by a resend) link is 404 feedback_not_found, an old one 410 feedback_expired,
 * a second answer 409 already_submitted. The client never says who the teacher is or what kind.
 */
@Injectable()
export class FeedbackPublicService {
  constructor(
    private readonly queries: FeedbackRepo,
    private readonly limit: PublicFeedbackLimit,
    @Inject(FEEDBACK_CONFIG) private readonly config: FeedbackConfig,
  ) {}

  async form(call: PublicCall, now = new Date()): Promise<FeedbackFormView> {
    return toFormView(await this.resolve(call, now));
  }

  async submit(call: PublicCall & { body: unknown }, now = new Date()): Promise<{ submitted: true }> {
    const ctx = await this.resolve(call, now);
    if (ctx.row.submitted_at) throw conflict('already_submitted');
    const input = parseOrThrow(feedbackSubmitSchema, call.body);
    // The update only matches an unanswered row: a racing double submit loses here and cannot overwrite.
    const saved = await this.queries.answer(ctx.row.id, answerOf(input, ctx, now));
    if (!saved) throw conflict('already_submitted');
    return { submitted: true };
  }

  private async resolve(call: PublicCall, now: Date): Promise<PublicContext> {
    await this.limit.check({ ip: call.ip, token: call.token });
    const { lessonId, studentId } = this.verified(call.token, now);
    const ctx = await this.queries.byTokenHash(hashToken(call.token));
    if (!ctx || ctx.row.lesson_id !== lessonId || ctx.row.student_id !== studentId) throw invalid();
    if (Date.parse(ctx.row.expires_at) <= now.getTime()) throw expired();
    return ctx;
  }

  /** The signed payload, or 404 (wrong, tampered, unconfigured) / 410 (expired). */
  private verified(token: string, now: Date): TokenPayload {
    if (!this.config.secret) throw invalid();
    const check = verifyToken(this.config.secret, token, now);
    if (check.ok) return check.payload;
    throw check.reason === 'expired' ? expired() : invalid();
  }
}
