import { changePicks, samePicks, type BookedCourse, type SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure } from '@/booking/booking-errors';
import { SlotStep } from '@/booking/SlotStep';
import { t } from '@/lib/i18n';
import { requestId as newRequestId } from '@/lib/request-id';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { type, useTheme } from '@/theme';
import { daysText } from '../course-days';
import { changeRequest } from './change-body';
import { useChangeCourse } from './change-queries';
import { CourseChangeDone } from './CourseChangeDone';
import { CourseChangeReview } from './CourseChangeReview';

export interface CourseChangeFlowProps {
  student: SalesCourseView['student'];
  /** The course to change (view.current: running today, else the next one booked ahead). */
  course: BookedCourse;
  /** «رجوع» from the days: back to the course screen. */
  onLeave: () => void;
  /** After the change: out of the screen. */
  onDone: () => void;
}

/**
 * «تغيير أيام الحلقات» (owner 2026-10-18): exactly the plan's days a week, prefilled with the course's
 * own from max(today, its first day) (SlotStep multi, the course's lessons not busy against
 * themselves; «التالي» waits until a day or a time differs) → the review with the remaining lessons and
 * the clashes → «احفظ الأيام الجديدة». The teacher, the length and the zone stay the course's. One
 * clientRequestId per flow (rule 8).
 */
export function CourseChangeFlow({ student, course, onLeave, onDone }: CourseChangeFlowProps) {
  const { color } = useTheme();
  const [step, setStep] = useState<'slot' | 'review'>('slot');
  const [first] = useState(() => changePicks(course, new Date()));
  const [picks, setPicks] = useState(() => first.map((p) => p.at));
  const [requestId] = useState(newRequestId);
  const change = useChangeCourse();
  const body = changeRequest({ subscriptionId: course.subscriptionId, picks, tz: course.tz, requestId, prefilled: first });
  const hold = samePicks(picks, course.tz, course.days) ? t.booking.courseChange.noChange : undefined;
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
            {t.booking.courseChange.currentDays.replace('{days}', daysText(course.days, course.tz))}
          </AppText>
          <AppText style={note}>{t.booking.courseChange.changeHint}</AppText>
          <SlotStep
            teacherId={course.teacherId}
            tz={course.tz}
            durationMin={course.durationMin}
            exclude={{ course: course.subscriptionId, studentIds: [student.id] }}
            multi={{ picks, onChange: setPicks, onNext: () => go('review'), need: course.perWeek ?? course.days.length, hold }}
          />
        </>
      );
    }
    return (
      <CourseChangeReview
        course={course}
        picks={picks}
        body={body}
        saving={{
          busy: change.isPending,
          failure: change.isError ? bookFailure(change.error) : null,
          submit: () => (body ? change.mutate(body) : undefined),
        }}
        onChangeSlot={() => go('slot')}
      />
    );
  };
  return (
    <>
      <ScreenHeader
        title={t.booking.courseChange.changeDays}
        subtitle={`${student.name} · ${student.code}`}
        trailing={<Button variant="ghost" label={t.common.back} busy={change.isPending} onPress={back} />}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {content()}
      </ScrollView>
    </>
  );
}
