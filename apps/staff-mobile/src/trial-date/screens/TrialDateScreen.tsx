import { router, useLocalSearchParams } from 'expo-router';
import { BookingModeProvider } from '@/booking/shared/booking-mode';
import { useTreeBase } from '@/core/nav/tree-base';
import { t, BackButton, EmptyState, Screen, ScreenHeader } from '@ab/mobile-kit';
import { programOf } from '@/trial-date/lib/trial-href';
import { TrialDateFlow } from './TrialDateFlow';

type Params = { studentId?: string; name?: string; program?: string };

/**
 * «موعد تجريبي جديد» for one existing student (owner 2026-10-25):
 * /students/trial-date/:studentId (admin, from the student file, in the Students tab's stack) and
 * /sales/inbox/trial-date?studentId (a salesperson, from her family chat, inside (sales-chat)).
 * A link without the student says «غير موجود». The sales tree books through /sales/booking (her own students only), the admin through /booking.
 */
export function TrialDateScreen() {
  const { studentId = '', name = '', program } = useLocalSearchParams<Params>();
  const base = useTreeBase();
  const fallback = () => router.replace(base ? `${base}/inbox` : `/students/${studentId}`);
  if (!studentId) {
    return (
      <Screen>
        <ScreenHeader
          title={t.trialDate.action}
          leading={<BackButton onPress={() => router.back()} />}
        />
        <EmptyState title={t.common.notFound} />
      </Screen>
    );
  }
  return (
    <Screen>
      <BookingModeProvider value={base === '/sales' ? 'sales' : 'admin'}>
        <TrialDateFlow key={studentId} studentId={studentId} name={name} program={programOf(program)} fallback={fallback} />
      </BookingModeProvider>
    </Screen>
  );
}
