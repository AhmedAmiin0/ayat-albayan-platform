import type { SalesPaymentView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { money } from '@/payments/format';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';

/**
 * The transfer is recorded: «أصبح الطالب مشتركًا» when the student is now active (a paid trial),
 * else «تم تسجيل التحويل»; then «تم» back to the chat.
 */
export function TransferDone({ payment, onDone }: { payment: SalesPaymentView; onDone: () => void }) {
  const { color } = useTheme();
  const m = t.salesMoney;
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
    </View>
  );
}
