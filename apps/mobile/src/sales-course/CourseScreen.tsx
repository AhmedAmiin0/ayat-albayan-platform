import { router, useLocalSearchParams } from 'expo-router';
import type { CourseBlock } from '@ab/shared';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { bookFailure, isCodedRefusal } from '@/booking/booking-errors';
import { BookingModeProvider } from '@/booking/booking-mode';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { CourseChangeFlow } from './change/CourseChangeFlow';
import { CurrentCourse } from './change/CurrentCourse';
import { CourseWizard } from './CourseWizard';
import { useCourseView, type CourseViewState } from './use-course-view';

/** The student; the chat's number and the new package, when «اشتراك جديد» goes on to its transfer. */
type Params = { studentId?: string; phone?: string; subscriptionId?: string };

/**
 * /inbox/sales-course?studentId=…[&phone=…&subscriptionId=…] (R-ASST-01, owner 2026-10-18): the
 * assistant books the weekly days of the subscription she sold: المعلم/ة → أيام الحلقات → المراجعة.
 * A student she cannot book shows why (courseBlocked). Opened right after «احفظ الاشتراك» it then
 * goes on to the transfer («سجّل التحويل البنكي», also offered to skip the days for now, and
 * whenever the wizard is not shown: a refusal, a failed read, still loading). A student with a course
 * (view.current: running today, else booked ahead) is offered «تغيير أيام الحلقات» beside the wizard or
 * the refusal; it replaces the course_exists refusal.
 */
export function CourseScreen() {
  const params = useLocalSearchParams<Params>();
  const { course, view, block } = useCourseView(params.studentId ?? '');
  const base = useTreeBase();
  const [changing, setChanging] = useState(false);
  const current = view?.current ?? null;
  const leave = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  const { phone, subscriptionId } = params;
  const transfer =
    phone && subscriptionId
      ? () => router.replace(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone, subscriptionId } }))
      : undefined;
  const change = current ? { course: current, open: () => setChanging(true) } : undefined;
  // The course shown with «تغيير أيام الحلقات» answers course_exists: no refusal line then.
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
          trailing={<Button variant="ghost" label={t.common.back} onPress={leave} />}
        />
        <CourseStatus course={course} block={refusal} missing={!params.studentId} />
        {change ? <CurrentCourse course={change.course} onChange={change.open} /> : null}
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
  if (missing) return <EmptyState title={t.common.notFound} />;
  if (course.isError) {
    const failure = bookFailure(course.error);
    if (failure.kind === 'error' && isCodedRefusal(course.error)) return <EmptyState title={failure.text} />;
    const message = failure.kind === 'error' || failure.kind === 'invoice' ? failure.text : t.common.error;
    return <ErrorState message={message} onRetry={() => void course.refetch()} />;
  }
  if (block) return <EmptyState title={t.booking.courseBlocked[block]} />;
  return course.isPending ? <AppText>{t.common.loading}</AppText> : null;
}
