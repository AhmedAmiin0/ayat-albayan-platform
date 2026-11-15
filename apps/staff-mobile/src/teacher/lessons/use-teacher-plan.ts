import {
  joinPhase,
  lessonPlan,
  reportStage,
  wayIn,
  type JoinPhase,
  type LessonPlan,
  type ReportStage,
  type WayIn,
} from '@ab/client-core';
import { isOpenLesson, type LessonView } from '@ab/shared';
import { usePlatformClassroom, useJoinWindow } from '@/core/lib/query/public-config';
import { useNow } from '@/core/lib/time/use-now';
import { useTeacherActs, type TeacherActs } from '@/teacher/lesson-actions';

/** What a lead button needs to draw and press itself. */
export interface LeadContext {
  lesson: LessonView;
  way: WayIn;
  acts: TeacherActs;
  stage: ReportStage | null;
  /** Opens the lesson's report form in the current tab. */
  onReport: (lessonId: string) => void;
}

interface TeacherPlan {
  plan: LessonPlan;
  join: JoinPhase;
  ctx: LeadContext;
}

interface PlanOptions {
  onNotice: (text: string) => void;
  onReport: (lessonId: string) => void;
}

/**
 * One lesson's plan for the teacher (docs/48): the client-core model on the clock (useNow), the
 * academy's join window and her way in (owner Q3: her own link on a non-platform lesson), plus
 * «سأحضر» / «إلغاء الحلقة» from useTeacherActs. The row, the hero and «جدولي» all read it.
 */
export function useTeacherPlan(lesson: LessonView, o: PlanOptions): TeacherPlan {
  const now = useNow();
  const win = useJoinWindow();
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const acts = useTeacherActs(lesson, o.onNotice);
  const stage = reportStage(lesson, now);
  const way = wayIn({ platform, ownLink: lesson.meeting_link });
  const join = joinPhase(lesson, now, win);
  const plan = lessonPlan({
    join,
    wayIn: way,
    open: isOpenLesson(lesson.status),
    canConfirm: acts.canConfirm,
    canCancel: acts.canCancel,
    stage,
  });
  return { plan, join, ctx: { lesson, way, acts, stage, onReport: o.onReport } };
}
