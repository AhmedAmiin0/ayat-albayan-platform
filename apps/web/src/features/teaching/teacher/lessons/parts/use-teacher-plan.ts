import {
  joinPhase,
  lessonPlan,
  reportStage,
  teacherCanAct,
  teacherCanConfirm,
  wayIn,
  type JoinPhase,
  type LessonPlan,
  type ReportStage,
  type WayIn,
} from '@ab/client-core';
import { isOpenLesson, type LessonView } from '@ab/shared';
import { useJoinWindow, usePlatformClassroom } from '@/lib/settings/public-config';
import { useNow } from '@/lib/time/use-now';

export interface TeacherPlan extends LessonPlan {
  stage: ReportStage | null;
  way: WayIn;
  phase: JoinPhase;
  /** The lesson's own teacher holds it in our classroom (platform_classroom, else the academy). */
  platform: boolean;
  now: Date;
}

/**
 * The lesson's lead and peers for the teacher (docs/48), from the pure client-core model on the
 * live clock: «سأحضر» until the join window opens, «ادخل الحلقة» until ends_at, then the report.
 */
export function useTeacherPlan(lesson: LessonView): TeacherPlan {
  const now = useNow();
  const win = useJoinWindow();
  const platform = usePlatformClassroom(lesson.platform_classroom);
  const way = wayIn({ platform, ownLink: lesson.meeting_link });
  const phase = joinPhase(lesson, now, win);
  const stage = reportStage(lesson, now);
  const plan = lessonPlan({
    join: phase,
    wayIn: way,
    open: isOpenLesson(lesson.status),
    canConfirm: teacherCanConfirm(lesson, now),
    canCancel: teacherCanAct(lesson, now),
    stage,
  });
  return { ...plan, stage, way, phase, platform, now };
}
