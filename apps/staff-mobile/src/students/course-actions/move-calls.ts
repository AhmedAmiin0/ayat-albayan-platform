import { courseStopCalls, courseTeacherCalls, courseTimesCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { z } from 'zod';
import type { ChangeCalls } from '@/sales-course';

const stops = courseStopCalls({ apiFetch, apiSend });
const teacherMoves = courseTeacherCalls({ apiFetch, apiSend });
const timesMoves = courseTimesCalls({ apiFetch, apiSend });

/** The change flow on `/students/:id/course-times`. */
export const timesChangeCalls = (studentId: string): ChangeCalls => ({
  key: `times:${studentId}`,
  check: (body) => timesMoves.check(studentId, body),
  change: (body) => timesMoves.change(studentId, body),
});

/** The change flow on `/students/:id/course-teacher`, sending the new teacher. */
export const teacherChangeCalls = (studentId: string, teacherId: string): ChangeCalls => ({
  key: `teacher:${studentId}:${teacherId}`,
  check: (body) => teacherMoves.check(studentId, { ...body, teacherId }),
  change: (body) => teacherMoves.change(studentId, { ...body, teacherId }),
});

// Each route answers the current package when asked without a subscriptionId; in the order tried.
const currentSourceSchema = z.enum(['stop', 'times', 'teacher']);
type CurrentSource = z.infer<typeof currentSourceSchema>;

const currentReads: Readonly<Record<CurrentSource, (studentId: string) => Promise<string>>> = {
  stop: (id) => stops.preview(id, {}).then((view) => view.subscriptionId),
  times: (id) => timesMoves.view(id, {}).then((view) => view.course.subscriptionId),
  teacher: (id) => teacherMoves.view(id, {}).then((view) => view.course.subscriptionId),
};

/** The first route the viewer may read the current package from; null when none is allowed. */
export const currentSource = (
  allowed: Readonly<Record<CurrentSource, boolean>>,
): CurrentSource | null => currentSourceSchema.options.find((source) => allowed[source]) ?? null;

/** The id of the student's current package; a 404 means the student has none. */
export const readCurrentPackage = (studentId: string, source: CurrentSource): Promise<string> =>
  currentReads[source](studentId);
