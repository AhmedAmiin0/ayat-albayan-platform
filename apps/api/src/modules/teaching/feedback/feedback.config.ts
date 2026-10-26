/** Injection token for the feedback link settings (overridden in tests). */
export const FEEDBACK_CONFIG = Symbol('FEEDBACK_CONFIG');

/** secret = FEEDBACK_TOKEN_SECRET; null = not configured (requests 503, public links refused). */
export interface FeedbackConfig {
  secret: string | null;
}
