import type { PortalActionResult } from '@ab/shared';
import { apiErrorCode } from '../../../core/http/index.js';
import type { FamilyLessonInput, PortalLessonSends } from './lesson-sends.js';

// One family lesson action, as the family app and the web portal send it, and
// the notice each says once it lands (portal.actions.<notice>).

export type FamilyAction =
  | (FamilyLessonInput & { kind: 'confirm' })
  | (FamilyLessonInput & { kind: 'cancel'; reason?: string })
  | (FamilyLessonInput & { kind: 'request'; startsAt: string; note?: string })
  | (FamilyLessonInput & { kind: 'withdraw' });

type FamilyNotice = 'confirmedNotice' | 'declinedNotice' | 'sentNotice' | 'withdrawnNotice';

export const FAMILY_NOTICE: Readonly<Record<FamilyAction['kind'], FamilyNotice>> = {
  confirm: 'confirmedNotice',
  cancel: 'declinedNotice',
  request: 'sentNotice',
  withdraw: 'withdrawnNotice',
};

type Run = (sends: PortalLessonSends, a: FamilyAction) => Promise<PortalActionResult>;

/** RUNS is keyed by the action's kind, so each handler only ever sees its own kind. */
type Of<K extends FamilyAction['kind']> = Extract<FamilyAction, { kind: K }>;

const RUNS: Readonly<Record<FamilyAction['kind'], Run>> = {
  confirm: (s, a) => s.confirm(a),
  cancel: (s, a) => s.cancel(a),
  request: (s, a) => s.request(a as Of<'request'>),
  withdraw: (s, a) => s.withdraw(a),
};

/** Sends the action to its route (a TanStack mutationFn). */
export const runFamilyAction =
  (sends: PortalLessonSends) =>
  (a: FamilyAction): Promise<PortalActionResult> =>
    RUNS[a.kind](sends, a);

/** The family's own words for a refused action (portal.actions.errors.<code>), or null. */
const FAMILY_ERRORS = [
  'proposal_pending',
  'lesson_started',
  'no_request',
  'date_in_past',
  'group_lesson',
] as const;
type FamilyError = (typeof FAMILY_ERRORS)[number];

export function familyErrorOf(error: unknown): FamilyError | null {
  const code = apiErrorCode(error);
  return FAMILY_ERRORS.find((c) => c === code) ?? null;
}

/** portal.actions' words for a refusal: one per known code, else the general one. */
export interface FailureWords {
  errors: Readonly<Record<FamilyError, string>>;
  failed: string;
}

/** A refused action in the family's words (both the family app and the web portal say it). */
export function familyFailureText(error: unknown, words: FailureWords): string {
  const known = familyErrorOf(error);
  return known ? words.errors[known] : words.failed;
}
