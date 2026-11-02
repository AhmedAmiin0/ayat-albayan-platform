import { changePicks, changePrefillFrom, type BookedCourse, type SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure, dayStartUtc } from '@/booking';
import { SlotStep } from '@/booking/trial/components/SlotStep';
import { t } from '@/core/lib/i18n/i18n';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { type, useTheme } from '@/theme';
import { daysText } from '@/sales-course/lib/course-days';
import { changeRequest, withOverride, withTeacher, type ChangeTarget } from './change-body';
import { useChangeCourse } from './change-queries';
import { CourseChangeDone } from './CourseChangeDone';
import { CourseChangeReview } from './CourseChangeReview';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface CourseChangeFlowProps {
  student: Pick<SalesCourseView['student'], 'id' | 'name' | 'code'>;
  /** The course to change (view.current: running today, else the next one booked ahead). */
  course: BookedCourse;
  /** «رجوع» from the days: back to the course screen. */
  onLeave: () => void;
  /** After the change: out of the screen. */
  onDone: () => void;
  /** The student profile's routes (owner 2026-10-30); absent = the assistant's own. */
  target?: ChangeTarget | undefined;
}

/**
 * «تغيير أيام الحلقات» (owner 2026-10-18): exactly the plan's days a week, prefilled with the course's
 * own from changePrefillFrom (the later of changeOpensOn and startsOn), its 7-day slot window opening
 * on that same day (SlotStep multi, the course's lessons not busy against themselves) so the
 * prefilled picks show checked (a pick rolled a week on while today's lesson is still on ends past
 * the window and shows only in the picked list) → the review with the remaining lessons and the clashes (unchanged
 * days: the check's own no_change) → «احفظ الأيام الجديدة». Trade-off: the window has no paging, so a
 * pending change's old days before its startsOn cannot be picked here (web pages back to them). The
 * teacher, the length and the zone stay the course's. One clientRequestId per flow (rule 8).
 */
export function CourseChangeFlow({ student, course, onLeave, onDone, target }: CourseChangeFlowProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const [step, setStep] = useState<'slot' | 'review'>(target?.review ? 'review' : 'slot');
  const [now] = useState(() => new Date());
  const [first] = useState(() => changePicks(course, now));
  const [from] = useState(() => dayStartUtc(changePrefillFrom(course, now), course.tz).toISOString());
  const [picks, setPicks] = useState(() => first.map((p) => p.at));
  const [requestId] = useState(newRequestId);
  const change = useChangeCourse(target?.path);
  const draft = { subscriptionId: course.subscriptionId, picks, tz: course.tz, requestId };
  const body = withTeacher(changeRequest({ ...draft, prefilled: first }), target);
  const go = (next: 'slot' | 'review') => {
    change.reset();
    setStep(next);
  };
  const back = () => {
    if (change.isSuccess) return onDone();
    return step === 'slot' ? onLeave() : go('slot');
  };
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  const content = () => {
    if (change.isSuccess) return <CourseChangeDone result={change.data} onDone={onDone} />;
    if (step === 'slot') {
      return (
        <>
          <AppText style={{ ...note, color: color.ink }}>
            {t.booking.courseChange.currentDays.replace('{days}', daysText(course.days, course.tz, viewer))}
          </AppText>
          <AppText style={note}>{t.booking.courseChange.changeHint}</AppText>
          <SlotStep
            teacherId={target?.teacherId ?? course.teacherId}
            tz={course.tz}
            durationMin={course.durationMin}
            from={from}
            exclude={{ course: course.subscriptionId, studentIds: [student.id] }}
            multi={{ picks, onChange: setPicks, onNext: () => go('review'), need: course.perWeek ?? course.days.length }}
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
        trailing={<Button variant="ghost" label={t.common.back} busy={change.isPending} onPress={back} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {content()}
      </ScrollView>
    </>
  );
}
