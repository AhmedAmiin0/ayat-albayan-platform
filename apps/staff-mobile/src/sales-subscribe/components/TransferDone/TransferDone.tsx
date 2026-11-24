import type { SalesPaymentView } from '@ab/shared';
import { router } from 'expo-router';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, NuqtaGlyph, money } from '@ab/mobile-kit';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { ButtonRow } from '@/core/ui/actions';

interface TransferDoneProps {
  payment: SalesPaymentView;
  onDone: () => void;
}

/** dismissTo pops the chat group back to the tabs; a push would stack a second tab host. */
export function TransferDone({ payment, onDone }: TransferDoneProps) {
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
      <Button label={m.done} onPress={onDone} />
      <ButtonRow testID="transfer-done-actions">
        <Button variant="secondary" label={t.booking.bookCourseDays} onPress={() => router.push(inTree(base, course))} />
        <Button variant="secondary" label={m.openMyPayments} onPress={() => router.dismissTo(`${more}/earnings?view=payments`)} />
      </ButtonRow>
    </View>
  );
}
