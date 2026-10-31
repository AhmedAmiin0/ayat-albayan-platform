import { continueFits, courseOpensOn, prefillDays, type BookedCourse, type PrefilledPick, type SalesCourseView } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure } from '@/booking/shared/booking-errors';
import { SlotStep } from '@/booking/trial/components/SlotStep';
import { dayStartUtc } from '@/booking/shared/slots';
import { t } from '@/core/lib/i18n/i18n';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Button } from '@/core/ui/primitives/Button';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { courseRequest } from '@/sales-course/lib/course-body';
import { useBookCourse } from '@/sales-course/hooks/course-queries';
import { CourseConfirm } from './CourseConfirm';
import { CourseDone } from './CourseDone';
import { CourseOpening, type CourseChangeEntry } from './CourseOpening';
import { CourseStarts } from './CourseStarts';
import { COURSE_STEPS, firstStep, stepBack, stepNumber, type CourseStep } from '@/sales-course/lib/course-steps';
import { useKnownTeacher } from '@/sales-course/hooks/use-known-teacher';

type Teacher = { id: string; name: string };

interface CourseWizardProps {
  /** A bookable course (courseBlock is null): a subscription and its weekly days are known. */
  view: SalesCourseView;
  onLeave: () => void;
  /** On to the package's transfer (opened right after «احفظ الاشتراك»). */
  transfer?: (() => void) | undefined;
  /** The student's course (view.current): «تغيير أيام الحلقات» beside the first step. */
  change?: CourseChangeEntry | undefined;
}

/**
 * The assistant's course (R-ASST-01, R-SCH-06): المعلم/ة (filtered by the student's program and
 * preference) → one time per weekday, exactly the plan's days a week (SlotStep multi) → المراجعة
 * with the series check. The package, the length and the zone come from the subscription and the
 * student, never asked; the days are offered from its first day on (starts_on in the student's
 * zone, or the day after a previous course, never before today: courseOpensOn), or from now. A renewal
 * (view.previous) opens on «تابِع بنفس الأيام»: its teacher and days prefilled in the coming week
 * (prefillDays), straight to the review when they are the plan's days a week (continueFits), else to
 * the days to add or remove one. One clientRequestId per wizard (rule 8).
 */
export function CourseWizard({ view, onLeave, transfer, change }: CourseWizardProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const previous = view.previous ?? null;
  const [now] = useState(() => new Date().toISOString());
  const [step, setStep] = useState<CourseStep>(firstStep(previous !== null));
  const [same, setSame] = useState(false);
  const [teacher, setTeacher] = useState<Teacher>({ id: '', name: '' });
  const [picks, setPicks] = useState<string[]>([]);
  const [prefilled, setPrefilled] = useState<PrefilledPick[]>([]);
  const [requestId] = useState(newRequestId);
  const book = useBookCourse();
  const known = useKnownTeacher(view.student.program, previous?.teacherId);
  const body = courseRequest({ view, teacherId: teacher.id, picks, requestId, prefilled });
  const sub = view.subscription;
  const opensOn = courseOpensOn(view, now);
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
    setPrefilled([]);
    setPicks([]);
    go('slot');
  };
  const continueSame = (prev: BookedCourse, opens: string) => {
    const days = prefillDays({ days: prev.days, from: opens, tz: view.student.tz, now });
    setTeacher({ id: prev.teacherId, name: '' });
    setPrefilled(days);
    setPicks(days.map((p) => p.at));
    setSame(true);
    go(continueFits(view) ? 'confirm' : 'slot');
  };
  const other = () => {
    setSame(false);
    go('teacher');
  };
  const shownName = teacher.name || known.name;
  const content = () => {
    if (book.isSuccess && body) {
      return <CourseDone result={book.data} body={body} view={view} onDone={onLeave} transfer={transfer} />;
    }
    if (step === 'continue' || step === 'teacher') {
      const handlers = { onSame: continueSame, onOther: other, onPick: pickTeacher };
      return <CourseOpening view={view} step={step} opensOn={opensOn} known={known} change={change} {...handlers} transfer={transfer} />;
    }
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
          failure: book.isError ? bookFailure(book.error, cycle, tz) : null,
          submit: () => (body ? book.mutate(body) : undefined),
        }}
        onChangeSlot={() => go('slot')}
        prefilled={prefilled.map((p) => p.at)}
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
