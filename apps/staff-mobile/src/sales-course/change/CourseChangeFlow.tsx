import {
  changePicks,
  changePrefillFrom,
  type BookedCourse,
  type SalesCourseView,
} from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure, dayStartUtc, LessonTimesStep } from '@/booking';
import { t, AppText, BackButton, ScreenHeader, type, useTheme } from '@ab/mobile-kit';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { daysText } from '@/sales-course/lib/course-days';
import { changeRequest, withOverride, type ChangeTarget } from './change-body';
import { useChangeCourse } from './change-queries';
import { CourseChangeDone } from './CourseChangeDone';
import { CourseChangeReview } from './CourseChangeReview';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseChangeFlowProps {
  student: Pick<SalesCourseView['student'], 'id' | 'name' | 'code'>;
  /** The course to change (view.current: running today, else the next one booked ahead). */
  course: BookedCourse;
  onLeave: () => void;
  /** After the change: out of the screen. */
  onDone: () => void;
  /** The student profile's routes; absent = the assistant's own. */
  target?: ChangeTarget | undefined;
}

/** No paging, so a pending change's old days before startsOn cannot be picked; rule 8 id. */
export function CourseChangeFlow({
  student,
  course,
  onLeave,
  onDone,
  target,
}: CourseChangeFlowProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const [step, setStep] = useState<'slot' | 'review'>(target?.review ? 'review' : 'slot');
  const [now] = useState(() => new Date());
  const [first] = useState(() => changePicks(course, now));
  const [opens] = useState(() => changePrefillFrom(course, now));
  const from = dayStartUtc(opens, course.tz).toISOString();
  const [picks, setPicks] = useState(() => first.map((p) => p.at));
  const [requestId] = useState(newRequestId);
  const change = useChangeCourse(target?.calls);
  const draft = { subscriptionId: course.subscriptionId, picks, tz: course.tz, requestId };
  const body = changeRequest({ ...draft, prefilled: first });
  const go = (next: 'slot' | 'review') => {
    change.reset();
    setStep(next);
  };
  const back = () => {
    if (change.isSuccess) {
      onDone();
      return;
    }
    step === 'slot' ? onLeave() : go('slot');
  };
  const note = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink2,
  };
  const content = () => {
    const done = { onDone, lines: target?.lines };
    if (change.isSuccess) return <CourseChangeDone result={change.data} {...done} />;
    if (step === 'slot') {
      return (
        <>
          <AppText style={{ ...note, color: color.ink }}>
            {t.booking.courseChange.currentDays.replace(
              '{days}',
              daysText(course.days, course.tz, viewer),
            )}
          </AppText>
          <AppText style={note}>{t.booking.courseChange.changeHint}</AppText>
          <LessonTimesStep
            teacherId={target?.teacherId ?? course.teacherId}
            opens={opens}
            tz={course.tz}
            durationMin={course.durationMin}
            from={from}
            exclude={{ course: course.subscriptionId, studentIds: [student.id] }}
            multi={{
              picks,
              onChange: setPicks,
              onNext: () => go('review'),
              need: course.perWeek ?? course.days.length,
            }}
          />
        </>
      );
    }
    return (
      <CourseChangeReview
        course={course}
        picks={picks}
        body={body}
        target={target}
        saving={{
          busy: change.isPending,
          failure: change.isError ? bookFailure(change.error, cycle, tz) : null,
          submit: (reason) => (body ? change.mutate(withOverride(body, reason)) : undefined),
        }}
        onChangeSlot={() => go('slot')}
      />
    );
  };
  return (
    <>
      <ScreenHeader
        title={target?.title ?? t.booking.courseChange.changeDays}
        subtitle={`${student.name} · ${student.code}`}
        leading={<BackButton busy={change.isPending} onPress={back} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {content()}
      </ScrollView>
    </>
  );
}
