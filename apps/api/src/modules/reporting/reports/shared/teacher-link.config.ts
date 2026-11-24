/** Injection token for the teacher report link's secret (overridden in tests). */
export const TEACHER_LINK_CONFIG = Symbol('TEACHER_LINK_CONFIG');

/**
 * secret = FEEDBACK_TOKEN_SECRET (the existing public-link secret); null = links are not issued and
 * refused.
 */
export interface TeacherLinkConfig {
  secret: string | null;
}
