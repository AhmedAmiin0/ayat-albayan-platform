import type { SalesMoneySubscriptionView } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, FilterPills, FormLabel } from '@ab/mobile-kit';
import { partPaidLine } from '@/payments';
import { dueText, packageLabel } from '@/sales-subscribe/lib/package-text';

interface OpenPackagePickerProps {
  /** Her open packages in the family (at least one). */
  packages: readonly SalesMoneySubscriptionView[];
  value: SalesMoneySubscriptionView | undefined;
  onChange: (subscriptionId: string) => void;
}

export function OpenPackagePicker({ packages, value, onChange }: OpenPackagePickerProps) {
  const { color } = useTheme();
  const line = (weight: 500 | 600, ink: string) => ({
    fontFamily: type.ui[weight],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: ink,
    fontVariant: ['tabular-nums' as const],
  });
  const only = packages.length === 1 ? packages[0] : undefined;
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.payments.subscription}</FormLabel>
      {only ? (
        <AppText style={line(600, color.ink)}>{packageLabel(only)}</AppText>
      ) : (
        <FilterPills
          wrap
          role="radiogroup"
          accessibilityLabel={t.payments.mobile.chooseSubscription}
          items={packages.map((p) => ({ value: p.id, label: packageLabel(p) }))}
          value={value?.id ?? ''}
          onChange={onChange}
        />
      )}
      {value ? (
        <AppText style={line(500, color.ink2)}>{partPaidLine(value) ?? dueText(value)}</AppText>
      ) : null}
    </View>
  );
}
