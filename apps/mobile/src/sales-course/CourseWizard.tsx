import { courseOpensOn, prefillPicks, type BookedCourse, type SalesCourseView } from '@ab/shared';
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
import { COURSE_STEPS, firstStep, stepBack, stepNumber, type CourseStep } from './course-steps';
import { CourseContinue } from './CourseContinue';
import { CourseTeacherStep } from './CourseTeacherStep';
import { useTeacherName } from './use-teacher-name';

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
 * zone, or the day after a previous course: courseOpensOn), or from now. A renewal (view.previous) opens
 * on «تابِع بنفس الأيام»: its teacher and days, prefilled, straight to the review. One clientRequestId
 * per wizard (rule 8).
 */
export function CourseWizard({ view, onLeave, transfer }: CourseWizardProps) {
  const previous = view.previous ?? null;
  const [step, setStep] = useState<CourseStep>(firstStep(previous !== null));
  const [same, setSame] = useState(false);
  const [teacher, setTeacher] = useState<Teacher>({ id: '', name: '' });
  const [picks, setPicks] = useState<string[]>([]);
  const [requestId] = useState(newRequestId);
  const book = useBookCourse();
  const known = useTeacherName(view.student.program, previous?.teacherId);
  const body = courseRequest({ view, teacherId: teacher.id, picks, requestId });
  const sub = view.subscription;
  const opensOn = courseOpensOn(view);
  const from = opensOn ? { from: dayStartUtc(opensOn, view.student.tz).toISOString() } : {};
  const go = (next: CourseStep) => {
    book.reset();
    setStep(next);
  };
  const back = () => {
    const prev = book.isSuccess ? null : stepBack({ step, same, renewal: previous !== null });
    return prev ? go(prev) : onLeave();
  };
  const position = t.booking.stepOf
    .replace('{n}', String(stepNumber(step)))
    .replace('{total}', String(COURSE_STEPS.length));
  const pickTeacher = (next: Teacher) => {
    setTeacher(next);
    setPicks([]);
    go('slot');
  };
  const continueSame = (prev: BookedCourse, opens: string) => {
    const now = new Date().toISOString();
    setTeacher({ id: prev.teacherId, name: '' });
    setPicks(prefillPicks({ days: prev.days, from: opens, tz: view.student.tz, now }));
    setSame(true);
    go('confirm');
  };
  const shownName = teacher.name || known;
  /** A renewal's first step; the teacher step when the previous course or the start is unknown. */
  const continueStep = () => {
    const other = () => {
      setSame(false);
      go('teacher');
    };
    if (!previous || !opensOn) return <CourseTeacherStep student={view.student} onPick={pickTeacher} transfer={transfer} />;
    return (
      <CourseContinue previous={previous} opensOn={opensOn} onSame={() => continueSame(previous, opensOn)} onOther={other} transfer={transfer} />
    );
  };
  const content = () => {
    if (book.isSuccess && body) {
      return <CourseDone result={book.data} body={body} view={view} onDone={onLeave} transfer={transfer} />;
    }
    if (step === 'continue') return continueStep();
    if (step === 'teacher') return <CourseTeacherStep student={view.student} onPick={pickTeacher} transfer={transfer} />;
    if (step === 'slot') {
      return (
        <SlotStep
          teacherId={teacher.id}
          tz={view.student.tz}
          durationMin={sub?.duration ?? 45}
          {...from}
          multi={{ picks, onChange: setPicks, onNext: () => go('confirm'), need: view.perWeek ?? 0 }}
        />
      );
    }
    return (
      <CourseConfirm
        view={view}
        teacherName={shownName}
        picks={picks}
        body={body}
        booking={{
          busy: book.isPending,
          failure: book.isError ? bookFailure(book.error) : null,
          submit: () => (body ? book.mutate(body) : undefined),
        }}
        onChangeSlot={() => go('slot')}
        prefilled={same}
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
