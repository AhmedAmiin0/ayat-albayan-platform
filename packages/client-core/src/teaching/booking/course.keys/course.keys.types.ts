import type { CardTree } from '../course-card';
import type { CourseMoveKind } from '../course-actions';

export type CourseKey = readonly unknown[];

export interface CourseRef {
  studentId: string;
  subscriptionId: string;
}

export interface PauseWindow {
  studentId: string;
  from: string;
  until: string | null;
}

export interface CourseKeys {
  stopPreview: (ref: CourseRef) => CourseKey;
  move: (ref: CourseRef, kind: CourseMoveKind) => CourseKey;
  current: (studentId: string, path: string | null) => CourseKey;
  teachers: (studentId: string) => CourseKey;
  card: (studentId: string, tree: CardTree) => CourseKey;
  extend: (ref: CourseRef) => CourseKey;
  cardLesson: (lessonId: string) => CourseKey;
}

export interface PauseKeys {
  preview: (window: PauseWindow) => CourseKey;
  resume: (studentId: string) => CourseKey;
}
