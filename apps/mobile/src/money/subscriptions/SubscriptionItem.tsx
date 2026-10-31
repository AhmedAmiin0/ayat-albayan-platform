import { memo } from 'react';
import { cancelOffered, countsForMoney, isCancelled, packageProgress, paymentState, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTabOpen } from '@/auth/use-tab-open';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { CancelPackage } from '@/payments';
import { t } from '@/core/lib/i18n/i18n';
import { money, packageName, paidLine } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';

/** The web's renewal highlight: saffron «فاضل حلقتان» once the package is at the alert threshold. */
function subscriptionProgress(sub: SubscriptionView, threshold?: number) {
  const { lessons_used, lessons_total } = sub.balance;
  return packageProgress(lessons_used, lessons_total, {
    forms: t.subscriptions.progress,
    ...(threshold === undefined ? {} : { threshold }),
  });
}

/** The status word; a status newer than this bundle (an old OTA) shows its code instead of nothing. */
const statusLabel = (status: SubscriptionView['status']): string => t.enums.subscriptionStatus[status] ?? status;

/** «سجّل دفعة» / «إلغاء الباقة», full width under the tags (docs/07 §6): never shrink-wrapped in the tag line. */
function SubscriptionActions({ sub, pay }: { sub: SubscriptionView; pay: boolean }) {
  const cancel = cancelOffered(sub);
  if (!pay && !cancel) return null;
  return (
    <View testID="subscription-actions" style={{ width: '100%', gap: 8 }}>
      {pay ? (
        <Button
          variant="secondary"
          label={t.mobileMoney.recordPayment}
          accessibilityLabel={`${t.mobileMoney.recordPayment} · ${sub.student.name}`}
          onPress={() => router.push(`/students/payment/${sub.student.id}`)}
        />
      ) : null}
      {cancel ? (
        <CancelPackage
          cancel={(body) => apiSend('POST', `/subscriptions/${sub.id}/cancel`, body)}
          stale={[pathKey('/subscriptions'), ['students', sub.student.id]]}
        />
      ) : null}
    </View>
  );
}

/**
 * One package: student + code, package and price, the lessons left (saffron when a renewal is due),
 * the status chip; a part-paid one says how much is left (owner 2026-10-28). A row opens the student; «سجّل دفعة» opens the existing payment form while it
 * is not fully paid; «إلغاء الباقة» while nothing is paid. A cancelled package is history only: its chip, no action.
 */
export const SubscriptionItem = memo(function SubscriptionItem({ sub, threshold }: { sub: SubscriptionView; threshold?: number }) {
  const { color } = useTheme();
  const toStudents = useTabOpen('students');
  const progress = subscriptionProgress(sub, threshold);
  const gone = isCancelled(sub);
  const due = !gone && progress.tone === 'act' && sub.status !== 'paused' && sub.status !== 'trial';
  const partial = countsForMoney(sub) && paymentState(sub) !== 'full';
  return (
    <ListRow
      title={sub.student.name}
      meta={sub.student.code}
      subtitle={`${packageName(sub)} · ${money(sub.price, sub.currency)}`}
      onPress={toStudents ? () => router.push(`/students/${sub.student.id}`) : undefined}
      tags={
        <>
          <AppText
            style={{
              fontFamily: due ? type.ui[700] : type.ui[500],
              fontSize: type.size.xs,
              color: due ? color.act : color.ink2,
            }}
          >
            {gone ? '—' : due ? `${progress.remainingLabel} · ${t.mobileMoney.renewalDue}` : progress.remainingLabel}
          </AppText>
          {partial ? <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{paidLine(sub)}</AppText> : null}
          <SubscriptionActions sub={sub} pay={partial && toStudents} />
        </>
      }
      trailing={
        <View>
          <StatusChip {...subscriptionStatusStyle[sub.status]} label={statusLabel(sub.status)} size="sm" />
        </View>
      }
    />
  );
});
