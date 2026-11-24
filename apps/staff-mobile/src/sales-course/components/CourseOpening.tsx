import { continueFits, type BookedCourse, type SalesCourseView } from '@ab/shared';
import { View } from 'react-native';
import { CurrentCourse } from '@/sales-course/change/CurrentCourse';
import { CourseContinue } from './CourseContinue';
import { CourseTeacherStep } from './CourseTeacherStep';
import type { KnownTeacher } from '@/sales-course/hooks/use-known-teacher';

export interface CourseChangeEntry {
  course: BookedCourse;
  open: () => void;
}

interface CourseOpeningProps {
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
          saved={Boolean(view.draft)}
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
