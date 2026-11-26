import type { SalesFamilyStudent } from '@ab/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { backWithin } from '@/core/nav/back-within';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import {
  t,
  Button,
  BackButton,
  EmptyState,
  ErrorState,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { useSalesCourse } from '@/sales-course';
import { useSalesFamily } from '@/sales-subscribe/lib/family';
import { SalesSubscribeForm } from '@/sales-subscribe/components/SalesSubscribeForm';

/** A zone in the link is ignored (academy day rules); `renew` '1' opens the last package. */
type Params = { phone?: string; studentId?: string; renew?: string };

/** The picked child (one of hers), else the route's, else the only one, else none yet (''). */
function childOf(
  students: readonly SalesFamilyStudent[],
  ids: { picked: string | undefined; route: string | undefined },
): string {
  const id = ids.picked ?? ids.route ?? (students.length === 1 ? students[0]?.id : undefined) ?? '';
  return students.some((s) => s.id === id) ? id : '';
}

/** A new package for one of her students only (R-ASST-01), then its days and payment. */
export function SalesSubscribeScreen() {
  const params = useLocalSearchParams<Params>();
  const phone = params.phone ?? '';
  const family = useSalesFamily(phone);
  const students = family.data?.students ?? [];
  const base = useTreeBase();
  const back = () => backWithin(inTree(base, '/inbox'));
  const renew = params.renew === '1';
  const [picked, setPicked] = useState<string>();
  const studentId = childOf(students, { picked, route: params.studentId });
  const child = students.find((s) => s.id === studentId);
  // Renewal only while the picked child is due; a sibling not due gets a new package.
  const renewing = renew && (child ? child.renew_due : true);
  // Lesson days are offered for a child listed through sales.renew_any too.
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
            {courseDays ? (
              <Button variant="secondary" label={t.booking.courseDays} onPress={courseDays} />
            ) : null}
            <SalesSubscribeForm
              phone={phone}
              students={students}
              studentId={studentId}
              onPick={setPicked}
              renew={renew}
              onDone={back}
            />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
