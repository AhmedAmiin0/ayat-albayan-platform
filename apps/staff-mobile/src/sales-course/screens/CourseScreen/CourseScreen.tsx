import { router, useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import type { CourseBlock } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure, isCodedRefusal } from '@/booking';
import { BookingModeProvider } from '@/booking/shared/booking-mode';
import {
  t,
  AppText,
  Button,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { CourseChangeFlow } from '@/sales-course/change/CourseChangeFlow';
import { CurrentCourse } from '@/sales-course/change/CurrentCourse';
import { CourseWizard } from '@/sales-course/components/CourseWizard';
import { useCourseView, type CourseViewState } from '@/sales-course/hooks/use-course-view';

type Params = { studentId?: string; phone?: string; subscriptionId?: string };

/** R-ASST-01: a blocked student shows why; an existing course offers the change flow instead. */
export function CourseScreen() {
  const params = useLocalSearchParams<Params>();
  const { course, view, block } = useCourseView(params.studentId ?? '');
  const base = useTreeBase();
  const [changing, setChanging] = useState(false);
  const current = view?.current ?? null;
  const leave = () => backWithin(inTree(base, '/inbox'));
  const { phone, subscriptionId } = params;
  const transfer =
    phone && subscriptionId
      ? () => router.replace(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone, subscriptionId } }))
      : undefined;
  const change = current ? { course: current, open: () => setChanging(true) } : undefined;
  // An existing course shown with the change action answers course_exists, so no refusal line.
  const refusal = change && block === 'course_exists' ? null : block;
  const content = () => {
    if (view && current && changing) {
      return <CourseChangeFlow student={view.student} course={current} onLeave={() => setChanging(false)} onDone={leave} />;
    }
    if (view && !block) return <CourseWizard view={view} onLeave={leave} transfer={transfer} change={change} />;
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
        <ScreenHeader
          title={t.booking.courseDays}
          {...(view ? { subtitle: `${view.student.name} · ${view.student.code}` } : {})}
          leading={<BackButton onPress={leave} />}
        />
        <CourseStatus course={course} block={refusal} missing={!params.studentId} />
        {change ? <CurrentCourse course={change.course} onChange={change.open} secondary={!!transfer} /> : null}
        {transfer ? <Button label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
      </ScrollView>
    );
  };
  return (
    <Screen>
      <BookingModeProvider value="sales">{content()}</BookingModeProvider>
    </Screen>
  );
}

interface CourseStatusProps {
  course: CourseViewState['course'];
  block: CourseBlock | null;
  /** A link without a student. */
  missing: boolean;
}

/**
 * Why there is no wizard: no student, loading, the course she cannot book, or a failed read: a refusal
 * (403 not_your_student, 404 student_not_found) shows its line with no retry, anything else retries.
 */
function CourseStatus({ course, block, missing }: CourseStatusProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  if (missing) return <EmptyState title={t.common.notFound} />;
  if (course.isError) {
    const failure = bookFailure(course.error, cycle, tz);
    if (failure.kind === 'error' && isCodedRefusal(course.error)) return <EmptyState title={failure.text} />;
    const message = failure.kind === 'error' || failure.kind === 'invoice' ? failure.text : t.common.error;
    return <ErrorState message={message} onRetry={() => void course.refetch()} />;
  }
  if (block) return <EmptyState title={t.booking.courseBlocked[block]} />;
  return course.isPending ? <AppText>{t.common.loading}</AppText> : null;
}
