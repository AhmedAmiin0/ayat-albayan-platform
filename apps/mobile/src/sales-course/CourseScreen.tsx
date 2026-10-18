import { router, useLocalSearchParams } from 'expo-router';
import type { CourseBlock } from '@ab/shared';
import { ScrollView } from 'react-native';
import { bookFailure, isCodedRefusal } from '@/booking/booking-errors';
import { BookingModeProvider } from '@/booking/booking-mode';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorState } from '@/ui/ErrorState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';
import { CourseWizard } from './CourseWizard';
import { useCourseView, type CourseViewState } from './use-course-view';

/** The student; the chat's number and the new package, when «اشتراك جديد» goes on to its transfer. */
type Params = { studentId?: string; phone?: string; subscriptionId?: string };

/**
 * /inbox/sales-course?studentId=…[&phone=…&subscriptionId=…] (R-ASST-01, owner 2026-10-18): the
 * assistant books the weekly days of the subscription she sold: المعلم/ة → أيام الحلقات → المراجعة.
 * A student she cannot book shows why (courseBlocked). Opened right after «احفظ الاشتراك» it then
 * goes on to the transfer («سجّل التحويل البنكي», also offered to skip the days for now, and
 * whenever the wizard is not shown: a refusal, a failed read, still loading).
 */
export function CourseScreen() {
  const params = useLocalSearchParams<Params>();
  const { course, view, block } = useCourseView(params.studentId ?? '');
  const base = useTreeBase();
  const leave = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  const { phone, subscriptionId } = params;
  const transfer =
    phone && subscriptionId
      ? () => router.replace(inTree(base, { pathname: '/inbox/sales-transfer', params: { phone, subscriptionId } }))
      : undefined;
  return (
    <Screen>
      <BookingModeProvider value="sales">
        {view && !block ? (
          <CourseWizard view={view} onLeave={leave} transfer={transfer} />
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
            <ScreenHeader
              title={t.booking.courseDays}
              {...(view ? { subtitle: `${view.student.name} · ${view.student.code}` } : {})}
              trailing={<Button variant="ghost" label={t.common.back} onPress={leave} />}
            />
            <CourseStatus course={course} block={block} missing={!params.studentId} />
            {transfer ? <Button label={t.salesMoney.stepTransfer} onPress={transfer} /> : null}
          </ScrollView>
        )}
      </BookingModeProvider>
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
