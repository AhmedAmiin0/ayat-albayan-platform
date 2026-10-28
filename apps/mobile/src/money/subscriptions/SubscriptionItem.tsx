import { memo } from 'react';
import { cancelOffered, isCancelled, packageProgress, paymentState, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTabOpen } from '@/auth/use-tab-open';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { CancelPackage } from '@/payments';
import { t } from '@/core/lib/i18n/i18n';
import { money, packageName, paidOf } from '@/payments/format';
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

/**
 * One package: student + code, package and price, the lessons left (saffron when a renewal is due),
 * the status chip. A row opens the student; «سجّل دفعة» opens the existing payment form while it
 * is not fully paid; «إلغاء الباقة» while nothing is paid. A cancelled package is history only: its chip, no action.
 */
export const SubscriptionItem = memo(function SubscriptionItem({ sub, threshold }: { sub: SubscriptionView; threshold?: number }) {
  const { color } = useTheme();
  const toStudents = useTabOpen('students');
  const progress = subscriptionProgress(sub, threshold);
  const gone = isCancelled(sub);
  const due = !gone && progress.tone === 'act' && sub.status !== 'paused' && sub.status !== 'trial';
  const partial = !gone && paymentState(sub) !== 'full';
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
          {partial ? <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{paidOf(sub)}</AppText> : null}
          {partial && toStudents ? (
            <Button
              variant="secondary"
              label={t.mobileMoney.recordPayment}
              accessibilityLabel={`${t.mobileMoney.recordPayment} · ${sub.student.name}`}
              onPress={() => router.push(`/students/payment/${sub.student.id}`)}
            />
          ) : null}
          {cancelOffered(sub) ? (
            <CancelPackage
              cancel={(body) => apiSend('POST', `/subscriptions/${sub.id}/cancel`, body)}
              stale={[pathKey('/subscriptions'), ['students', sub.student.id]]}
            />
          ) : null}
        </>
      }
      trailing={
        <View>
          <StatusChip {...subscriptionStatusStyle[sub.status]} label={t.enums.subscriptionStatus[sub.status]} size="sm" />
        </View>
      }
    />
  );
});
