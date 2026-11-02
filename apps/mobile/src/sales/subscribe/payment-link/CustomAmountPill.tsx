import { Pressable } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { shape, type, useTheme } from '@/theme';
import type { LinkPay } from './use-link-pay';

/**
 * «مبلغ مخصص» (owner 2026-11-01) under the discount pills, in their look (checked = the green
 * wash): on shows the amount field; off hides it and the link carries the calculator price after
 * the pill.
 */
export function CustomAmountPill({ pay }: { pay: LinkPay }) {
  const { color } = useTheme();
  const on = pay.custom;
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      accessibilityLabel={t.paymentLinks.customAmount}
      onPress={() => pay.setCustom(!on)}
      hitSlop={{ top: 4, bottom: 4 }}
      style={{
        alignSelf: 'flex-start',
        minHeight: 44,
        justifyContent: 'center',
        paddingHorizontal: 14,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: on ? color.lapisWash : color.rule,
        backgroundColor: on ? color.lapisWash : color.raised,
      }}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.sm,
          lineHeight: 22,
          color: on ? color.lapis : color.ink,
        }}
      >
        {t.paymentLinks.customAmount}
      </AppText>
    </Pressable>
  );
}
