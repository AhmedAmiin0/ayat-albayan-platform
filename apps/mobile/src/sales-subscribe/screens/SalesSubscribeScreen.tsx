import type { SalesFamilyStudent } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { Button } from '@/core/ui/primitives/Button';
import { BackButton } from '@/core/ui/navigation';
import { useSalesCourse } from '@/sales-course';
import { EmptyState } from '@/core/ui/feedback/EmptyState';
import { ErrorState } from '@/core/ui/feedback/ErrorState';
import { Screen } from '@/core/ui/layout/Screen';
import { ScreenHeader } from '@/core/ui/layout/ScreenHeader';
import { useSalesFamily } from '../lib/family';
import { SalesSubscribeForm } from '../components/SalesSubscribeForm';

/**
 * The chat's number; a child to preselect (any zone the link carries is ignored: the academy's day rules);
 * `renew` '1' = «جدّد الاشتراك»: a child due for one opens on its last package (several due: none picked yet).
 */
type Params = { phone?: string; studentId?: string; renew?: string };

/** The picked child (one of hers), else the route's, else the only one, else none yet (''). */
function childOf(students: readonly SalesFamilyStudent[], ids: { picked: string | undefined; route: string | undefined }): string {
  const id = ids.picked ?? ids.route ?? (students.length === 1 ? students[0]?.id : undefined) ?? '';
  return students.some((s) => s.id === id) ? id : '';
}

/**
 * /inbox/sales-subscribe?phone=… (R-ASST-01, owner 2026-10-12): «اشتراك جديد» from a family's chat by
 * the salesperson, for one of HER students only (GET /sales/money/family), the child picked here (owner
 * 2026-10-29: no names on the chat's pills). Priced and saved through the sales endpoints; then the
 * package's weekly days and its transfer, or a payment link (a Stripe build). The resolved child
 * (picked, preselected or the only one) also offers «أيام الحلقات» while its package may be booked
 * (GET /sales/booking/course: blocked null; owner 2026-11-06: a link sale left unbooked).
 */
export function SalesSubscribeScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const students = family.data?.students ?? [];
  const base = useTreeBase();
  const back = () => (router.canGoBack() ? router.back() : router.replace(inTree(base, '/inbox')));
  const renew = params.renew === '1';
  const [picked, setPicked] = useState<string>();
  const studentId = childOf(students, { picked, route: params.studentId });
  const child = students.find((s) => s.id === studentId);
  // «جدّد الاشتراك» only while the picked child is due (owner 2026-10-29: one pill; a sibling not due is a new package).
  const renewing = renew && (child ? child.renew_due : true);
  // «أيام الحلقات» for a child listed through sales.renew_any (`mine: false`) too (owner 2026-11-01).
  const bookable = useSalesCourse(studentId).data?.blocked === null;
  const wizard = inTree(base, { pathname: '/inbox/sales-course', params: { studentId } });
  const courseDays = bookable ? () => router.push(wizard) : undefined;
  return (
    <Screen>
      <ScrollView
        style={{ flex: 1, marginHorizontal: -16 }}
        contentContainerStyle={{ gap: 20, paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          title={renewing ? t.students.renew : t.salesMoney.newSubscription}
          leading={<BackButton onPress={back} />}
        />
        {family.isError ? (
          <ErrorState onRetry={() => void family.refetch()} />
        ) : !family.data ? null : students.length === 0 ? (
          <EmptyState title={t.salesMoney.noOwnStudents} />
        ) : (
          <>
            {courseDays ? <Button variant="secondary" label={t.booking.courseDays} onPress={courseDays} /> : null}
            <SalesSubscribeForm phone={phone} students={students} studentId={studentId} onPick={setPicked} renew={renew} onDone={back} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
