import { signPair, verifyPair } from '@/common/http/pair-token';

// The teacher's join link of ONE lesson (owner 2026-11-06, teacher_lesson_v3 «ادخل الحلقة»):
// base64url(lessonId | teacherId | exp).signature, 71 characters (common/http/pair-token.ts),
// signed with FEEDBACK_TOKEN_SECRET under its own context: a report or feedback token never
// verifies here, and this one never verifies there. Stateless: GET /join/:token reads the lesson.

const CONTEXT = 'teacher-join|';
/** The join link outlives the lesson's end by two hours (a late or overrunning lesson). */
export const JOIN_GRACE_MS = 2 * 3_600_000;

interface JoinPayload {
  lessonId: string;
  teacherId: string;
  /** Unix seconds. */
  exp: number;
}

const keyOf = (secret: string) => ({ secret, context: CONTEXT });

/** Unix seconds: the lesson's end + JOIN_GRACE_MS. */
export const joinExpiry = (endsAt: string): number =>
  Math.floor((Date.parse(endsAt) + JOIN_GRACE_MS) / 1000);

export function signTeacherJoin(secret: string, p: JoinPayload): string {
  return signPair(keyOf(secret), { a: p.lessonId, b: p.teacherId, exp: p.exp });
}

/** The payload of a valid, unexpired token; null otherwise (one answer, nothing learnt). */
export function verifyTeacherJoin(secret: string, token: string, now: Date): JoinPayload | null {
  const r = verifyPair(keyOf(secret), token, now);
  return r.ok ? { lessonId: r.payload.a, teacherId: r.payload.b, exp: r.payload.exp } : null;
}
