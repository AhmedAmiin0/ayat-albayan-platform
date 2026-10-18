import { continueFits, type BookedCourse, type SalesCourseView } from '@ab/shared';
import { View } from 'react-native';
import { CurrentCourse } from './change/CurrentCourse';
import { CourseContinue } from './CourseContinue';
import { CourseTeacherStep } from './CourseTeacherStep';
import type { KnownTeacher } from './use-known-teacher';

/** «تغيير أيام الحلقات» offered beside the wizard: the student's course (view.current) and how to open it. */
export interface CourseChangeEntry {
  course: BookedCourse;
  open: () => void;
}

export interface CourseOpeningProps {
  view: SalesCourseView;
  /** 'continue': a renewal's choice (when its start is known); 'teacher': the teacher list. */
  step: 'continue' | 'teacher';
  /** The first local day the new course may start (courseOpensOn). */
  opensOn: string | null;
  /** The previous course's teacher, when bookable. */
  known: KnownTeacher;
  change?: CourseChangeEntry | undefined;
  onSame: (previous: BookedCourse, opensOn: string) => void;
  onOther: () => void;
  onPick: (teacher: { id: string; name: string }) => void;
  transfer?: (() => void) | undefined;
}

/**
 * The wizard's first step: «تابِع بنفس الأيام» / «اختر أيامًا أخرى» on a renewal, else the teacher list;
 * above it, when the student already has a course, whether it runs or starts later, its days (not
 * twice) and «تغيير أيام الحلقات» as the secondary beside the step's own primary (owner 2026-10-18).
 */
export function CourseOpening(props: CourseOpeningProps) {
  const { view, step, opensOn, known, change, transfer } = props;
  const previous = view.previous ?? null;
  // The renewal's choice names the previous course's days: the same course above does not repeat them.
  const repeats = step === 'continue' && previous?.subscriptionId === change?.course.subscriptionId;
  return (
    <View style={{ gap: 16 }}>
      {change ? <CurrentCourse course={change.course} onChange={change.open} secondary hideDays={repeats} /> : null}
      {step === 'continue' && previous && opensOn ? (
        <CourseContinue
          previous={previous}
          opensOn={opensOn}
          teacher={known}
          adjustTo={continueFits(view) ? null : view.perWeek}
          onSame={() => props.onSame(previous, opensOn)}
          onOther={props.onOther}
          transfer={transfer}
        />
      ) : (
        <CourseTeacherStep student={view.student} onPick={props.onPick} transfer={transfer} />
      )}
    </View>
  );
}
