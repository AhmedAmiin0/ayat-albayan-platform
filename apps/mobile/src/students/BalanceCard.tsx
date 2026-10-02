import { subscriptionStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { packageName, paidOf, usedOf } from '@/payments/format';
import { packageLine } from '@/payments/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/queries';
import { RecentPayments } from '@/payments/RecentPayments';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { SectionLabel } from './SectionLabel';

/**
 * «رصيد الحلقات» (R-SUB-01/03, R-MOB-02): what is left (shared packageProgress; saffron only when
 * the renewal alert is due), the current package and what is paid of it, «سجّل دفعة», then the
 * latest payments. Secondary button: the guardian card already holds the screen's one filled one.
 * Nothing while the balance is unknown; a student without a package says so.
 */
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
              label={t.enums.subscriptionStatus[current.status]}
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
            <AppText style={small}>{paidOf(current)}</AppText>
            <View style={{ marginTop: 6 }}>
              <Button
                variant="secondary"
                label={t.payments.mobile.record}
                onPress={() => router.push(`/students/payment/${studentId}`)}
              />
            </View>
          </>
        ) : (
          <AppText style={small}>{t.subscriptions.empty}</AppText>
        )}
      </View>
      {current ? <RecentPayments studentId={studentId} /> : null}
    </View>
  );
}
