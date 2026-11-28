import { memo } from 'react';
import {
  cancelOffered,
  countsForMoney,
  isCancelled,
  owesMore,
  packageProgress,
  subscriptionStatusStyle,
  type SubscriptionView,
} from '@ab/money';
import { pushInTab } from '@/core/nav/back-within';
import { View } from 'react-native';
import { useTabOpen } from '@/core/auth/use-tab-open';
import {
  pathKey,
  t,
  type,
  useTheme,
  AppText,
  Button,
  ListRow,
  StatusChip,
  money,
  call,
} from '@ab/mobile-kit';
import { CancelPackage } from '@/payments';
import { packageName, paidLine } from '@/core/lib/money/format';

/** Matches the web's renewal highlight at the alert threshold. */
function subscriptionProgress(sub: SubscriptionView, threshold?: number) {
  const { lessons_used, lessons_total } = sub.balance;
  return packageProgress(lessons_used, lessons_total, {
    forms: t.subscriptions.progress,
    ...(threshold === undefined ? {} : { threshold }),
  });
}

/** The status word; a status newer than this bundle (an old OTA) shows its code instead of nothing. */
const statusLabel = (status: SubscriptionView['status']): string =>
  t.enums.subscriptionStatus[status] ?? status;

/** docs/07 §6: full width, never shrink-wrapped in the tag line. */
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
          onPress={() => pushInTab(`/students/payment/${sub.student.id}`)}
        />
      ) : null}
      {cancel ? (
        <CancelPackage
          cancel={(body) => call({ method: 'POST', path: `/subscriptions/${sub.id}/cancel`, body })}
          stale={[pathKey('/subscriptions'), ['students', sub.student.id]]}
        />
      ) : null}
    </View>
  );
}

/** Pay while not fully paid, cancel while nothing is paid; a cancelled package has no action. */
export const SubscriptionItem = memo(function SubscriptionItem({
  sub,
  threshold,
}: {
  sub: SubscriptionView;
  threshold?: number;
}) {
  const { color } = useTheme();
  const toStudents = useTabOpen('students');
  const progress = subscriptionProgress(sub, threshold);
  const gone = isCancelled(sub);
  const due = !gone && progress.tone === 'act' && sub.status !== 'paused' && sub.status !== 'trial';
  const partial = countsForMoney(sub) && owesMore(sub);
  return (
    <ListRow
      title={sub.student.name}
      meta={sub.student.code}
      subtitle={`${packageName(sub)} · ${money(sub.price, sub.currency)}`}
      onPress={toStudents ? () => pushInTab(`/students/${sub.student.id}`) : undefined}
      tags={
        <>
          <AppText
            style={{
              fontFamily: due ? type.ui[700] : type.ui[500],
              fontSize: type.size.xs,
              color: due ? color.act : color.ink2,
            }}
          >
            {gone
              ? '—'
              : due
                ? `${progress.remainingLabel} · ${t.mobileMoney.renewalDue}`
                : progress.remainingLabel}
          </AppText>
          {partial ? (
            <AppText style={{ fontSize: type.size.xs, color: color.ink2 }}>{paidLine(sub)}</AppText>
          ) : null}
          <SubscriptionActions sub={sub} pay={partial && toStudents} />
        </>
      }
      trailing={
        <View>
          <StatusChip
            {...subscriptionStatusStyle[sub.status]}
            label={statusLabel(sub.status)}
            size="sm"
          />
        </View>
      }
    />
  );
});
