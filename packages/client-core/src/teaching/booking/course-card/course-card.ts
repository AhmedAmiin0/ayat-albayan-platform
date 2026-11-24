import {
  courseCardSchema,
  courseExtendPreviewSchema,
  courseExtendResultSchema,
  courseResumePreviewSchema,
  type CourseCardView,
  type CourseExtendPreview,
  type CourseExtendResult,
  type CourseResumePreview,
} from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { apiErrorCode } from '../../../core/http/index.js';
import { courseActionsKey } from '../course-actions.js';

// Course card paths, query key and parsers (rule 12) for web and mobile.

const student = (studentId: string): string => `/students/${studentId}`;

/** Whose route reads the card: the admin's file (students.read) or an assistant's screen. */
export type CardTree = 'admin' | 'sales';
const CARD_BASE: Record<CardTree, (studentId: string) => string> = {
  admin: student,
  sales: (studentId) => `/sales${student(studentId)}`,
};

/** GET the card of the student's current package. */
export const courseCardPath = (input: { studentId: string; tree: CardTree }): string =>
  `${CARD_BASE[input.tree](input.studentId)}/course-card`;

/** The card's query key: under the course actions' (every action's re-read refreshes it). */
export const courseCardKey = (studentId: string): readonly ['course-actions', string, 'card'] => [
  ...courseActionsKey(studentId),
  'card',
];

export const courseExtendPath = (studentId: string): string => `${student(studentId)}/course-extend`;

export function courseExtendPreviewPath(input: {
  studentId: string;
  subscriptionId: string;
}): string {
  const q = encodeURIComponent(input.subscriptionId);
  return `${courseExtendPath(input.studentId)}?subscriptionId=${q}`;
}

export const courseResumePreviewPath = (studentId: string): string =>
  `${student(studentId)}/course-pause/resume-preview`;

const MINUTE_MS = 60_000;

/** GET /lessons over the minute a lesson starts (lessons.read). */
const lessonAtPath = (startsAt: string): string => {
  const start = Date.parse(startsAt);
  const from = encodeURIComponent(new Date(start).toISOString());
  const to = encodeURIComponent(new Date(start + MINUTE_MS).toISOString());
  return `/lessons?from=${from}&to=${to}`;
};

/**
 * The admin's full view of one lesson (a card's upcoming one, a reply's): GET /lessons over the
 * minute it starts, picked by id; null = moved or cancelled meanwhile. `fetch` is the app's.
 */
export async function readLessonAt<L extends { id: string }>(
  fetch: (path: string) => Promise<readonly L[]>,
  lesson: { id: string; startsAt: string },
): Promise<L | null> {
  const rows = await fetch(lessonAtPath(lesson.startsAt));
  return rows.find((l) => l.id === lesson.id) ?? null;
}

export const parseCourseCard = (data: unknown): CourseCardView => courseCardSchema.parse(data);
export const parseExtendPreview = (data: unknown): CourseExtendPreview =>
  courseExtendPreviewSchema.parse(data);

/** The app's authenticated fetch (each app's apiFetch). */
type Fetch = (path: string, init?: RequestInit) => Promise<unknown>;

export async function postCourseExtend(
  fetch: Fetch,
  input: { studentId: string; subscriptionId: string },
): Promise<CourseExtendResult> {
  const headers = { 'Content-Type': 'application/json' };
  const body = JSON.stringify({ subscriptionId: input.subscriptionId });
  const answer = await fetch(courseExtendPath(input.studentId), { method: 'POST', headers, body });
  return courseExtendResultSchema.parse(answer);
}
export const parseResumePreview = (data: unknown): CourseResumePreview =>
  courseResumePreviewSchema.parse(data);

/** Extending is offered only when package lessons are left without a date. */
export const extendOffered = (card: CourseCardView | undefined): boolean =>
  (card?.course?.unbooked ?? 0) > 0;

/** Paused opens the pause sheet, stopped opens cancellation; other statuses are set at once. */
export type StatusRoute = 'pause' | 'stop' | 'set';
const STATUS_ROUTES: Partial<Record<StudentStatus, StatusRoute>> = {
  paused: 'pause',
  churned: 'stop',
};
export const statusRoute = (status: StudentStatus): StatusRoute => STATUS_ROUTES[status] ?? 'set';

const EXTEND_CODES = [
  'already_cancelled',
  'course_not_found',
  'course_paused',
  'not_your_student',
  'subscription_not_found',
] as const;
export type CourseExtendErrorCode = (typeof EXTEND_CODES)[number] | 'generic';

export function courseExtendErrorCode(error: unknown): CourseExtendErrorCode {
  const code = apiErrorCode(error);
  return EXTEND_CODES.find((c) => c === code) ?? 'generic';
}
