import type { SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure } from '@/booking/booking-errors';
import { SlotStep } from '@/booking/SlotStep';
import { dayStartUtc } from '@/booking/slots';
import { t } from '@/lib/i18n';
import { requestId as newRequestId } from '@/lib/request-id';
import { Button } from '@/ui/Button';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { courseRequest } from './course-body';
import { useBookCourse } from './course-queries';
import { CourseConfirm } from './CourseConfirm';
import { CourseDone } from './CourseDone';
import { CourseStarts } from './CourseStarts';
import { CourseTeacherStep } from './CourseTeacherStep';

type Step = 'teacher' | 'slot' | 'confirm';
const STEPS: readonly Step[] = ['teacher', 'slot', 'confirm'];
type Teacher = { id: string; name: string };

export interface CourseWizardProps {
  /** A bookable course (courseBlock is null): a subscription and its weekly days are known. */
  view: SalesCourseView;
  onLeave: () => void;
  /** On to the package's transfer (opened right after «احفظ الاشتراك»). */
  transfer?: (() => void) | undefined;
}

/**
 * The assistant's course (R-ASST-01, R-SCH-06): المعلم/ة (filtered by the student's program and
 * preference) → one time per weekday, exactly the plan's days a week (SlotStep multi) → المراجعة
 * with the series check. The package, the length and the zone come from the subscription and the
 * student, never asked; the days are offered from its first day on (starts_on in the student's
 * zone), or from now. One clientRequestId per wizard (rule 8).
 */
export function CourseWizard({ view, onLeave, transfer }: CourseWizardProps) {
  const [step, setStep] = useState<Step>('teacher');
  const [teacher, setTeacher] = useState<Teacher>({ id: '', name: '' });
  const [picks, setPicks] = useState<string[]>([]);
  const [requestId] = useState(newRequestId);
  const book = useBookCourse();
  const body = courseRequest({ view, teacherId: teacher.id, picks, requestId });
  const at = STEPS.indexOf(step);
  const sub = view.subscription;
  const from = sub ? dayStartUtc(sub.starts_on, view.student.tz).toISOString() : undefined;
  const go = (next: Step) => {
    book.reset();
    setStep(next);
  };
  const back = () => (book.isSuccess || at === 0 ? onLeave() : go(STEPS[at - 1] ?? 'teacher'));
  const position = t.booking.stepOf.replace('{n}', String(at + 1)).replace('{total}', String(STEPS.length));
  const content = () => {
    if (book.isSuccess && body) {
      return <CourseDone result={book.data} body={body} view={view} onDone={onLeave} transfer={transfer} />;
    }
    if (step === 'teacher') {
      const pick = (next: Teacher) => {
        setTeacher(next);
        setPicks([]);
        go('slot');
      };
      return <CourseTeacherStep student={view.student} onPick={pick} transfer={transfer} />;
    }
    if (step === 'slot') {
      return (
        <SlotStep
          teacherId={teacher.id}
          tz={view.student.tz}
          durationMin={sub?.duration ?? 45}
          {...(from ? { from } : {})}
          multi={{ picks, onChange: setPicks, onNext: () => go('confirm'), need: view.perWeek ?? 0 }}
        />
      );
    }
    return (
      <CourseConfirm
        view={view}
        teacherName={teacher.name}
        picks={picks}
        body={body}
        booking={{
          busy: book.isPending,
          failure: book.isError ? bookFailure(book.error) : null,
          submit: () => (body ? book.mutate(body) : undefined),
        }}
        onChangeSlot={() => go('slot')}
      />
    );
  };
  return (
    <>
      <ScreenHeader
        title={t.booking.courseDays}
        subtitle={book.isSuccess ? view.student.name : `${view.student.name} · ${position}`}
        trailing={<Button variant="ghost" label={t.common.back} busy={book.isPending} onPress={back} />}
      />
      <CourseStarts subscription={sub} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {content()}
      </ScrollView>
    </>
  );
}
