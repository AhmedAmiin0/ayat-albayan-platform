// Test fixtures for the feedback tests (not shipped; excluded from the build by *.fakes.ts).
import type { AuthUser } from '../../../common/auth/verify-token';
import type { FeedbackRow, PublicContext, RequestContext } from './feedback.queries';
import type { FeedbackListRow } from './read/feedback.read.queries';
import { hashToken, signToken } from './public/feedback.token';

export const SECRET = 's'.repeat(40);
export const LESSON_ID = '00000000-0000-4000-8000-0000000000d1';
export const STUDENT_ID = '00000000-0000-4000-8000-0000000000c1';
export const TEACHER_ID = '00000000-0000-4000-8000-0000000000b1';
export const OTHER_TEACHER_ID = '00000000-0000-4000-8000-0000000000b2';
const GUARDIAN_ID = '00000000-0000-4000-8000-0000000000a1';
export const GUARDIAN_PHONE = '+966501234567';
export const NOW = new Date('2026-10-05T10:00:00Z');

export const ADMIN: AuthUser = { id: 'a0000000-0000-4000-8000-000000000001', email: null, role: 'admin' };
export const TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000002', email: null, role: 'teacher' };
export const OTHER_TEACHER: AuthUser = { id: 'b0000000-0000-4000-8000-000000000003', email: null, role: 'teacher' };
export const GUARDIAN: AuthUser = { id: 'c0000000-0000-4000-8000-000000000004', email: null, role: 'guardian' };

export const EXP = Math.floor(NOW.getTime() / 1000) + 14 * 86_400;
export const tokenFor = (exp = EXP, secret = SECRET) =>
  signToken(secret, { lessonId: LESSON_ID, studentId: STUDENT_ID, exp });

/** The pending row the live token belongs to. */
export function feedbackRow(over: Partial<FeedbackRow> = {}): FeedbackRow {
  return {
    id: '00000000-0000-4000-8000-0000000000f1',
    lesson_id: LESSON_ID,
    student_id: STUDENT_ID,
    guardian_id: GUARDIAN_ID,
    teacher_id: TEACHER_ID,
    kind: 'subscription',
    token_hash: hashToken(tokenFor()),
    requested_at: NOW.toISOString(),
    expires_at: new Date(EXP * 1000).toISOString(),
    rating: null,
    recommend: null,
    note: null,
    contact_phone: null,
    submitted_at: null,
    created_at: NOW.toISOString(),
    source: 'web_link',
    quick_rating: null,
    quick_rated_at: null,
    quick_rating_wa_id: null,
    ...over,
  };
}

export function publicContext(over: Partial<FeedbackRow> = {}): PublicContext {
  return { row: feedbackRow(over), teacherName: 'أبرار', guardianPhone: GUARDIAN_PHONE };
}

export function requestContext(over: Partial<RequestContext> = {}): RequestContext {
  return {
    lessonStatus: 'completed',
    attendance: 'on_time',
    teacher: { id: TEACHER_ID, name: 'أبرار' },
    kind: 'subscription',
    student: { id: STUDENT_ID, name: 'سهيلة' },
    guardian: { id: GUARDIAN_ID, phone: GUARDIAN_PHONE },
    ...over,
  };
}

export function listRow(over: Partial<FeedbackListRow> = {}): FeedbackListRow {
  const r = feedbackRow({ rating: 5, recommend: 'yes', note: 'ممتازة', contact_phone: '+966509999999', submitted_at: NOW.toISOString() });
  return {
    ...{ id: r.id, lesson_id: r.lesson_id, student_id: r.student_id, teacher_id: r.teacher_id, kind: r.kind },
    ...{ requested_at: r.requested_at, expires_at: r.expires_at, rating: r.rating, recommend: r.recommend },
    ...{ note: r.note, contact_phone: r.contact_phone, submitted_at: r.submitted_at },
    ...{ quick_rating: r.quick_rating, quick_rated_at: r.quick_rated_at },
    ...over,
  };
}
