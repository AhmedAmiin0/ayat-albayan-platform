import { packageProgress, paymentState, subscriptionStatusStyle, type SubscriptionView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTabOpen } from '@/auth/use-tab-open';
import { t } from '@/lib/i18n';
import { money, packageName, paidOf } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ListRow } from '@/core/ui/layout/ListRow';
import { StatusChip } from '@/core/ui/feedback/StatusChip';

/** The web's renewal highlight: saffron «فاضل حلقتان» once the package is at the alert threshold. */
export function subscriptionProgress(sub: SubscriptionView, threshold?: number) {
  const { lessons_used, lessons_total } = sub.balance;
  return packageProgress(lessons_used, lessons_total, {
    forms: t.subscriptions.progress,
    ...(threshold === undefined ? {} : { threshold }),
  });
}

/**
 * One package: student + code, package and price, the lessons left (saffron when a renewal is due),
 * the status chip. A row opens the student; «سجّل دفعة» opens the existing payment form while it
 * is not fully paid.
 */
export function SubscriptionItem({ sub, threshold }: { sub: SubscriptionView; threshold?: number }) {
  const { color } = useTheme();
  const toStudents = useTabOpen('students');
  const progress = subscriptionProgress(sub, threshold);
  const due = progress.tone === 'act' && sub.status !== 'paused' && sub.status !== 'trial';
  const partial = paymentState(sub) !== 'full';
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
            {due ? `${progress.remainingLabel} · ${t.mobileMoney.renewalDue}` : progress.remainingLabel}
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
        </>
      }
      trailing={
        <View>
          <StatusChip {...subscriptionStatusStyle[sub.status]} label={t.enums.subscriptionStatus[sub.status]} size="sm" />
        </View>
      }
    />
  );
}
