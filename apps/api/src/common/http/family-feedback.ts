/** A family's «رأيك يهمّنا» link: the signed token of /feedback/<token> and when it expires. */
export interface FamilyFeedbackLink {
  token: string;
  expiresAt: Date;
}

/**
 * The family's feedback link for one student's lesson, as the report's WhatsApp message needs it
 * (docs/19 «Report flow»). Implemented by the feedback module (FeedbackLinks, a global provider),
 * so the report PDF module does not import the feedback module (no import cycle). null = none.
 */
export abstract class FamilyFeedbackLinks {
  abstract forLesson(
    pair: { lessonId: string; studentId: string },
    now: Date,
  ): Promise<FamilyFeedbackLink | null>;
}
