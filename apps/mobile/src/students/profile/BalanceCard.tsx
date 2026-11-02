import { cancelOffered, subscriptionStatusStyle } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { apiSend } from '@/core/lib/http/api';
import { pathKey } from '@/core/lib/query/query-keys';
import { useStudentHref } from '@/core/nav/tree-base';
import { t } from '@/core/lib/i18n/i18n';
import { CancelPackage } from '@/payments';
import { packageName, paidLine, usedOf } from '@/core/lib/money/format';
import { packageLine } from '@/payments/lib/package-line';
import { useRenewalThreshold, useStudentBalance } from '@/payments/hooks/queries';
import { RecentPayments } from '@/payments/components/RecentPayments';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';

/**
 * «رصيد الحلقات» (R-SUB-01/03, R-MOB-02): what is left (shared packageProgress; saffron only when
 * the renewal alert is due), the current package and what is paid of it, «سجّل دفعة» («إلغاء الباقة» while
 * nothing is paid; owner 2026-10-28), then the
 * latest payments. Secondary button: the guardian card already holds the screen's one filled one.
 * Nothing while the balance is unknown; a student without a package says so.
 */
export function BalanceCard({ studentId }: { studentId: string }) {
  const { color } = useTheme();
  const balance = useStudentBalance(studentId).data;
  const line = packageLine(balance, useRenewalThreshold());
  const current = balance?.current;
  const to = useStudentHref();
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
            <View style={{ marginTop: 6 }}>
              <Button
                variant="secondary"
                label={t.payments.mobile.record}
                onPress={() => router.push(to(`/students/payment/${studentId}`))}
              />
            </View>
            {cancelOffered(current) ? (
              <CancelPackage
                cancel={(body) => apiSend('POST', `/subscriptions/${current.id}/cancel`, body)}
                stale={[['students', studentId], pathKey('/subscriptions')]}
              />
            ) : null}
          </>
        ) : (
          <AppText style={small}>{t.subscriptions.empty}</AppText>
        )}
      </View>
      {current ? <RecentPayments studentId={studentId} /> : null}
    </View>
  );
}
