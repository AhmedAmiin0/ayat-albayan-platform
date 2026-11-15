import { signPair, verifyPair } from '@/common/http/pair-token';

// The family app's «ادخل الحلقة» in the phone's browser (docs/50 §2, §7): /join/<token> on the web,
// no second sign-in. It signs (lessonId, studentId, exp = the room's close) with
// FEEDBACK_TOKEN_SECRET under its own context, so no other signed link verifies here. The pair
// token's «body.sig» travels without its dot (70 url-safe characters: a dotted path could be taken
// for a file by the web host); the fixed body length puts the dot back.

const CONTEXT = 'family-join|';
const BODY_CHARS = 48;
const TOKEN_RE = /^[A-Za-z0-9_-]{70}$/;
const MS = 1000;

export interface FamilyJoin {
  lessonId: string;
  studentId: string;
  /** Unix seconds. */
  exp: number;
}

const keyOf = (secret: string) => ({ secret, context: CONTEXT });

/** False for anything that cannot be a family join token: nothing is verified or read for it. */
export const looksLikeFamilyToken = (token: string): boolean => TOKEN_RE.test(token);

/** Unix seconds of an ISO time (the room's close). */
export const familyJoinExpiry = (closesAt: string): number => Math.floor(Date.parse(closesAt) / MS);

export function signFamilyJoin(secret: string, p: FamilyJoin): string {
  return signPair(keyOf(secret), { a: p.lessonId, b: p.studentId, exp: p.exp }).replace('.', '');
}

/** The payload of a valid, unexpired token; null otherwise (one answer, nothing learnt). */
export function verifyFamilyJoin(secret: string, token: string, now: Date): FamilyJoin | null {
  const dotted = `${token.slice(0, BODY_CHARS)}.${token.slice(BODY_CHARS)}`;
  const r = looksLikeFamilyToken(token) ? verifyPair(keyOf(secret), dotted, now) : null;
  return r?.ok ? { lessonId: r.payload.a, studentId: r.payload.b, exp: r.payload.exp } : null;
}
