import {
  continueFits,
  courseOpensOn,
  prefillDays,
  wallParts,
  type BookedCourse,
  type PrefilledPick,
  type SalesCourseView,
} from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure, dayStartUtc, LessonTimesStep } from '@/booking';
import { t, BackButton, ScreenHeader } from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { requestId as newRequestId } from '@/core/lib/http/request-id';
import { Note } from '@/more';
import { courseRequest } from '@/sales-course/lib/course-body';
import { useBookCourse } from '@/sales-course/hooks/course-queries';
import { CourseConfirm } from '@/sales-course/components/CourseConfirm';
import { CourseDone } from '@/sales-course/components/CourseDone';
import { CourseHeld } from '@/sales-course/components/CourseHeld';
import { CourseOpening, type CourseChangeEntry } from '@/sales-course/components/CourseOpening';
import { CourseStarts } from '@/sales-course/components/CourseStarts';
import { COURSE_STEPS, firstStep, stepBack, stepNumber, type CourseStep } from '@/sales-course/lib/course-steps';
import { useKnownTeacher } from '@/sales-course/hooks/use-known-teacher';

type Teacher = { id: string; name: string };

interface CourseWizardProps {
  /** A bookable course (courseBlock is null): a subscription and its weekly days are known. */
  view: SalesCourseView;
  onLeave: () => void;
  transfer?: (() => void) | undefined;
  change?: CourseChangeEntry | undefined;
}

/** R-ASST-01, R-SCH-06: package, length and zone are never asked; rule 8 id per wizard. */
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
  const book = useBookCourse(view.hold === true);
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
      if (book.data === null) return <CourseHeld onDone={onLeave} />;
      return <CourseDone result={book.data} body={body} view={view} onDone={onLeave} transfer={transfer} />;
    }
    if (step === 'continue' || step === 'teacher') {
      const handlers = { onSame: continueSame, onOther: other, onPick: pickTeacher };
      return <CourseOpening view={view} step={step} opensOn={opensOn} known={known} change={change} {...handlers} transfer={transfer} />;
    }
    if (step === 'slot') {
      return (
        <LessonTimesStep
          teacherId={teacher.id}
          tz={view.student.tz}
          durationMin={sub?.duration ?? 45}
          opens={opensOn ?? wallParts(now, view.student.tz).date}
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
        leading={<BackButton busy={book.isPending} onPress={back} />}
      />
      <CourseStarts subscription={sub} />
      {view.hold ? <Note>{t.courseDraft.held}</Note> : null}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        {content()}
      </ScrollView>
    </>
  );
}
