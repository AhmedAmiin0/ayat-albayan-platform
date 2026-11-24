import { looksLikeFamilyToken } from '@ab/shared';
import { signPair, verifyPair } from '@/common/http/pair-token';

// Family join token (docs/50 §2, §7): own signing context; the sig travels without its dot.

const CONTEXT = 'family-join|';
const BODY_CHARS = 48;
const MS = 1000;

export interface FamilyJoin {
  lessonId: string;
  studentId: string;
  /** Unix seconds. */
  exp: number;
}

const keyOf = (secret: string) => ({ secret, context: CONTEXT });

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
