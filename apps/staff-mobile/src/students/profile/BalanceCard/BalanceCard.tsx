import { cancelOffered, subscriptionStatusStyle } from '@ab/money';
import { View } from 'react-native';
import {
  apiSend,
  pathKey,
  t,
  shape,
  type,
  useTheme,
  AppText,
  StatusChip,
} from '@ab/mobile-kit';
import { CancelPackage } from '@/payments';
import { StartDateEdit, UsedBeforeEdit } from '@/subscribe';
import { packageName, paidLine, usedOf } from '@/core/lib/money/format';
import { packageLine } from '@/payments/lib/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/hooks/queries';
import { RecentPayments } from '@/payments/components/RecentPayments';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

/** Balance (R-SUB-01/03, R-MOB-02): saffron only when renewal is due; nothing while unknown. */
export function BalanceCard({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const balance = useStudentBalance(studentId).data;
  const line = packageLine(balance, useRenewalThreshold());
  const current = balance?.current;
  const small = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
  if (!balance) return null;
  return (
    <View style={{ gap: 20 }}>
      <View
        style={{
          gap: 6,
          padding: 12,
          borderRadius: shape.radius.lg,
          borderWidth: 1,
          borderColor: color.rule,
          backgroundColor: color.raised,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <SectionLabel>{t.subscriptions.balance}</SectionLabel>
          {current ? (
            <StatusChip
              {...subscriptionStatusStyle[current.status]}
              label={t.enums.subscriptionStatus[current.status] ?? current.status}
              size="sm"
            />
          ) : null}
        </View>
        {line && current ? (
          <>
            <AppText
              style={{
                fontFamily: type.ui[700],
                fontSize: type.size.lg,
                lineHeight: type.lineHeight(type.size.lg),
                color: line.alert ? color.act : color.ink,
              }}
            >
              {line.label}
            </AppText>
            <AppText style={small}>{`${packageName(current)} · ${usedOf(current)}`}</AppText>
            <AppText style={small}>{paidLine(current)}</AppText>
            {cancelOffered(current) ? (
              <CancelPackage
                cancel={(body) => apiSend('POST', `/subscriptions/${current.id}/cancel`, body)}
                stale={[['students', studentId], pathKey('/subscriptions')]}
              />
            ) : null}
            <UsedBeforeEdit sub={current} stale={[['students', studentId], pathKey('/subscriptions')]} />
            <StartDateEdit sub={current} stale={[['students', studentId], pathKey('/subscriptions')]} />
          </>
        ) : (
          <AppText style={small}>{t.subscriptions.empty}</AppText>
        )}
      </View>
      {current ? <RecentPayments studentId={studentId} /> : null}
    </View>
  );
}
