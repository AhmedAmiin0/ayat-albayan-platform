import { signPair, verifyPair } from '@/common/http/pair-token';

// The teacher's no-login report link for ONE lesson (owner 2026-11-05, docs/19 «Teacher report
// link»):
// base64url(lessonId | teacherId | exp).signature, 71 characters (common/http/pair-token.ts),
// signed
// with the server's FEEDBACK_TOKEN_SECRET under its own context, so a family's feedback token never
// verifies here and this token never verifies there. Stateless: the lesson's own teacher and time
// are
// checked again on every call (TeacherLinkAccess).

const CONTEXT = 'teacher-report|';
const HOUR_MS = 3_600_000;

export interface TeacherLinkPayload {
  lessonId: string;
  teacherId: string;
  /** Unix seconds. */
  exp: number;
}

type TeacherLinkCheck =
  | { ok: true; payload: TeacherLinkPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

const keyOf = (secret: string) => ({ secret, context: CONTEXT });

/** The link dies at the lesson's end + settings.report_teacher_edit_hours (unix seconds). */
export const teacherLinkExpiry = (endsAt: string, editHours: number): number =>
  Math.floor((Date.parse(endsAt) + editHours * HOUR_MS) / 1000);

export function signTeacherLink(secret: string, p: TeacherLinkPayload): string {
  return signPair(keyOf(secret), { a: p.lessonId, b: p.teacherId, exp: p.exp });
}

export function verifyTeacherLink(secret: string, token: string, now: Date): TeacherLinkCheck {
  const r = verifyPair(keyOf(secret), token, now);
  if (!r.ok) return r;
  return {
    ok: true,
    payload: { lessonId: r.payload.a, teacherId: r.payload.b, exp: r.payload.exp },
  };
}
