import type { SalesPaymentView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { inTree, useTreeBase } from '@/nav/tree-base';
import { money } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';

/**
 * The transfer is recorded: «أصبح الطالب مشتركًا» when the student is now active (a paid trial),
 * else «تم تسجيل التحويل»; then «احجز أيام الحلقات الآن» (the package's weekly days, R-ASST-01),
 * «مدفوعاتي» (her recorded payments: a tab's screen, so dismissTo pops the chat group back to the
 * tabs; a push would stack a second tab host) or «تم» back to the chat.
 */
export function TransferDone({ payment, onDone }: { payment: SalesPaymentView; onDone: () => void }) {
  const { color } = useTheme();
  const m = t.salesMoney;
  const base = useTreeBase();
  const more = base === '/sales' ? '/sales/more' : '/more/sales';
  const course = { pathname: '/inbox/sales-course', params: { studentId: payment.student.id } };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h2,
            lineHeight: type.lineHeight(type.size.h2, true),
            color: color.ink,
          }}
        >
          {payment.student.status === 'active' ? m.becameSubscribed : m.transferSaved}
        </AppText>
      </View>
      <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 }}>
        {`${payment.student.name} · ${money(payment.amount, payment.currency)}`}
      </AppText>
      <Button variant="secondary" label={t.booking.bookCourseDays} onPress={() => router.push(inTree(base, course))} />
      <Button variant="secondary" label={m.openMyPayments} onPress={() => router.dismissTo(`${more}/earnings?view=payments`)} />
      <Button label={m.done} onPress={onDone} />
    </View>
  );
}
