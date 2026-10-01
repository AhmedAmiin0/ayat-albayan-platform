import { formatRunningHead } from '@ab/shared';
import { t } from '@/lib/i18n';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { ScreenHeader } from '@/ui/ScreenHeader';

// «النهارده» (R-MOB-02, docs/07 §12): the admin's morning screen. No frame, no cartouche on mobile.
// TODO(R-MOB-02): filter pills, timeline spine + now-line, lesson cards with تأكيد/إلغاء arrive
// with /lessons (Phase 2/5). Until then the list is honestly empty.
export function TodayScreen() {
  // TODO(R-MOB-02): Hijri date from the API (Hermes ICU has no reliable islamic-umalqura, docs/07 §2).
  const dateLine = `${formatRunningHead(new Date()).gregorian}. ${t.availability.tzHint.replace(
    '{tz}',
    t.runningHead.riyadh,
  )}`;
  return (
    <Screen>
      <ScreenHeader title={t.mobile.today} subtitle={dateLine} />
      <EmptyState title={t.common.empty} />
    </Screen>
  );
}
