import {
  canJoinNow,
  DEFAULT_JOIN_WINDOW,
  isClosedLesson,
  isOpenLesson,
  type JoinWindowConfig,
  type LessonView,
} from '@ab/shared';
import { reportSendState } from '../reports/index.js';
import { teacherCanAct, teacherCanConfirm, teacherConfirmed } from './teacher-actions.js';

// docs/48 «Cross-screen model»: one pure lesson model for the teacher's «اليوم» and «جدولي» on
// web and mobile. Every answer is derived from the lesson and the clock (useNow), never fetched.

/** The teacher's live screens refetch her lessons and pending reports every 30 s (docs/48). */
export const TEACHER_REFRESH_MS = 30_000;

/** Where her report stands: null before the start or on a cancelled or moved lesson. */
export type ReportStage = 'write' | 'resume' | 'window' | 'done';
/** The teacher's own word for a lesson; `status` = the lesson-status chip. */
export type TeacherLessonState = 'awaiting' | 'confirmed' | 'running' | ReportStage | 'status';
/** live: in the join window before ends_at; after: still open after ends_at; off otherwise. */
export type JoinPhase = 'live' | 'after' | 'off';
/** The way in: our classroom, or the teacher's own fixed link (owner Q3). */
export type WayIn = 'room' | 'link';
export type PlanAction = 'join' | 'confirm' | 'report' | 'cancel';

type StudentReport = NonNullable<LessonView['students'][number]['report']>;
type ReportLesson = Pick<LessonView, 'status' | 'starts_at'> & {
  students: readonly { report?: StudentReport | null }[];
};
type StateLesson = ReportLesson & Pick<LessonView, 'ends_at' | 'teacher_confirmed_at'>;

const at = (iso: string): number => Date.parse(iso);
const started = (l: Pick<LessonView, 'starts_at'>, now: Date) => at(l.starts_at) <= now.getTime();
const ended = (l: Pick<LessonView, 'ends_at'>, now: Date) => at(l.ends_at) <= now.getTime();
const reportBlocked = (l: ReportLesson, now: Date) => isClosedLesson(l.status) || !started(l, now);

type ReportOf = StudentReport | null | undefined;
const STAGE_RULES: readonly (readonly [ReportStage, (r: ReportOf, now: Date) => boolean])[] = [
  ['write', (r) => !r],
  ['resume', (r) => r?.status === 'draft'],
  ['window', (r, now) => !!r && reportSendState(r, now) === 'window'],
];

const holds = (rule: (r: ReportOf, now: Date) => boolean, l: ReportLesson, now: Date) =>
  l.students.some((s) => rule(s.report, now));

/** Her report across the lesson's students: write > resume > window > done (docs/48). */
export function reportStage(lesson: ReportLesson, now: Date): ReportStage | null {
  if (reportBlocked(lesson, now)) return null;
  return STAGE_RULES.find(([, rule]) => holds(rule, lesson, now))?.[0] ?? 'done';
}

const running = (l: StateLesson, now: Date) =>
  isOpenLesson(l.status) && started(l, now) && !ended(l, now);

type StateRule = readonly [TeacherLessonState, (l: StateLesson, now: Date) => boolean];
const STATE_RULES: readonly StateRule[] = [
  ['awaiting', (l, now) => teacherCanConfirm(l, now)],
  ['confirmed', (l, now) => teacherCanAct(l, now) && teacherConfirmed(l)],
  ['running', running],
];

const isStageWord = (s: ReportStage | null): s is 'write' | 'resume' | 'window' =>
  s === 'write' || s === 'resume' || s === 'window';

/** The word on every row, chip and hero: the first rule that holds, then the report stage. */
export function teacherLessonState(lesson: StateLesson, now: Date): TeacherLessonState {
  const rule = STATE_RULES.find(([, ok]) => ok(lesson, now));
  const stage = reportStage(lesson, now);
  return rule?.[0] ?? (isStageWord(stage) ? stage : 'status');
}

type JoinLesson = Pick<LessonView, 'status' | 'starts_at' | 'ends_at' | 'room_opened_at'>;

/**
 * live until ends_at, then after while the window stays open (ends_at + join_closes_after_min,
 * 120 by default): after the end the report leads and join is a peer (docs/48 gap 1).
 */
export function joinPhase(
  lesson: JoinLesson,
  now: Date,
  win: JoinWindowConfig = DEFAULT_JOIN_WINDOW,
): JoinPhase {
  const joinable = isOpenLesson(lesson.status) && canJoinNow(lesson, now, win);
  if (!joinable) return 'off';
  return ended(lesson, now) ? 'after' : 'live';
}

/**
 * What a client can see of the API's roomFor: the classroom on a platform lesson or one with no
 * link of its own (lesson.meeting_link only, never the teacher's profile link), else her link.
 */
export const wayIn = (o: { platform: boolean; ownLink: string | null | undefined }): WayIn =>
  o.platform || !o.ownLink ? 'room' : 'link';

/** «اقترح موعدًا آخر»: the API rule (409 on a closed lesson or proposal_pending). */
type ProposeLesson = Pick<LessonView, 'status' | 'pending_proposal'>;
export const teacherCanPropose = (lesson: ProposeLesson): boolean =>
  isOpenLesson(lesson.status) && !lesson.pending_proposal;

export interface PlanInput {
  join: JoinPhase;
  wayIn: WayIn;
  /** The lesson is open (not held, cancelled or moved). */
  open: boolean;
  canConfirm: boolean;
  canCancel: boolean;
  stage: ReportStage | null;
}

export interface LessonPlan {
  lead: PlanAction | null;
  /** The other actions, in reading order. */
  peers: PlanAction[];
}

const writes = (p: PlanInput) => p.stage === 'write' || p.stage === 'resume';

const LEAD_RULES: readonly (readonly [PlanAction, (p: PlanInput) => boolean])[] = [
  ['join', (p) => p.join === 'live'],
  ['confirm', (p) => p.canConfirm],
  ['report', writes],
];

const linkStaysNear = (p: PlanInput) => p.wayIn === 'link' && p.open && p.join !== 'live';

const PEER_RULES: readonly (readonly [PlanAction, (p: PlanInput) => boolean])[] = [
  ['join', (p) => p.join === 'after' || linkStaysNear(p)],
  ['confirm', (p) => p.canConfirm],
  ['report', (p) => p.stage !== null],
  ['cancel', (p) => p.canCancel],
];

/** One lead (join live > confirm > report write/resume > none), then the peers in reading order. */
export function lessonPlan(input: PlanInput): LessonPlan {
  const lead = LEAD_RULES.find(([, ok]) => ok(input))?.[0] ?? null;
  const peers = PEER_RULES.filter(([a, ok]) => a !== lead && ok(input)).map(([a]) => a);
  return { lead, peers };
}
