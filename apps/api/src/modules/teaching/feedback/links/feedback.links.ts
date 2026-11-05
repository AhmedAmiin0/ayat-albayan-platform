import { feedbackEligible } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import type { FamilyFeedbackLinks } from '@/common/http/family-feedback';
import { FEEDBACK_CONFIG, type FeedbackConfig } from '@/modules/teaching/feedback/feedback.config';
import {
  FeedbackRepo,
  type FeedbackRow,
  type RequestContext,
} from '@/modules/teaching/feedback/feedback.repo';
import { expiryOf, hashToken, signToken } from '@/modules/teaching/feedback/public/feedback.token';

interface FeedbackLink {
  /** The signed token of /feedback/<token> (the web page «رأيك يهمّنا»). */
  token: string;
  expiresAt: Date;
}

interface Pair {
  lessonId: string;
  studentId: string;
}

const live = (row: FeedbackRow, now: Date): boolean =>
  row.submitted_at !== null || Date.parse(row.expires_at) > now.getTime();

/**
 * The family's «رأيك يهمّنا» link for one student's lesson, for the report's WhatsApp message
 * (docs/19
 * «Report flow»): the row's live link when there is one (rebuilt from its expiry, the same token
 * the
 * admin's request sends; an answered one opens «already answered»), else a new 14-day link stored
 * like
 * «ابعت طلب الرأي» does. null when the secret is unset, or the student or guardian is not found.
 */
@Injectable()
export class FeedbackLinks implements FamilyFeedbackLinks {
  constructor(
    private readonly queries: FeedbackRepo,
    @Inject(FEEDBACK_CONFIG) private readonly config: FeedbackConfig,
  ) {}

  async forLesson(pair: Pair, now: Date): Promise<FeedbackLink | null> {
    const { secret } = this.config;
    if (!secret) return null;
    const existing = await this.queries.find(pair.lessonId, pair.studentId);
    const kept =
      existing && live(existing, now) ? this.rebuilt({ secret, pair, row: existing }) : null;
    return kept ?? this.issue({ secret, pair }, now);
  }

  /** The row's own link again (same HMAC); null when its hash no longer matches. */
  private rebuilt(input: { secret: string; pair: Pair; row: FeedbackRow }): FeedbackLink | null {
    const exp = Math.floor(Date.parse(input.row.expires_at) / 1000);
    const token = signToken(input.secret, { ...input.pair, exp });
    return hashToken(token) === input.row.token_hash
      ? { token, expiresAt: new Date(exp * 1000) }
      : null;
  }

  private async issue(
    input: { secret: string; pair: Pair },
    now: Date,
  ): Promise<FeedbackLink | null> {
    const ctx = await this.queries.requestContext(input.pair.lessonId, input.pair.studentId);
    // Only an attended lesson is rated (absent / excused: no link, as for the admin's request).
    if (!ctx || !feedbackEligible(ctx.lessonStatus, ctx.attendance)) return null;
    const made = await issueLink(this.queries, { ...input, ctx }, now);
    return made ? { token: made.token, expiresAt: new Date(made.exp * 1000) } : null;
  }
}

/**
 * A new 14-day link stored on the row (created, or an unanswered row's link replaced, which revokes
 * the old one). null = the row is already answered: an answer is never reset.
 */
export async function issueLink(
  repo: Pick<FeedbackRepo, 'issue'>,
  input: { secret: string; pair: Pair; ctx: RequestContext },
  now: Date,
): Promise<{ row: FeedbackRow; token: string; exp: number } | null> {
  const { pair, ctx } = input;
  const exp = expiryOf(now);
  const token = signToken(input.secret, { ...pair, exp });
  const row = await repo.issue({
    lesson_id: pair.lessonId,
    student_id: pair.studentId,
    guardian_id: ctx.guardian.id,
    teacher_id: ctx.teacher.id,
    kind: ctx.kind,
    token_hash: hashToken(token),
    requested_at: now.toISOString(),
    expires_at: new Date(exp * 1000).toISOString(),
  });
  return row ? { row, token, exp } : null;
}
