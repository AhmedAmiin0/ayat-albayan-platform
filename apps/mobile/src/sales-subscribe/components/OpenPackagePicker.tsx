import type { SalesMoneySubscriptionView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { partPaidLine } from '@/payments';
import { FormLabel } from '@/core/ui/form/FormLabel';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { dueText, packageLabel } from '@/sales-subscribe/lib/package-text';

interface OpenPackagePickerProps {
  /** Her open packages in the family (at least one). */
  packages: readonly SalesMoneySubscriptionView[];
  value: SalesMoneySubscriptionView | undefined;
  onChange: (subscriptionId: string) => void;
}

/** «الاشتراك»: which of her owed packages the transfer pays, and what is still due on it (part-paid: what was paid of what, owner 2026-10-28). */
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
      {value ? <AppText style={line(500, color.ink2)}>{partPaidLine(value) ?? dueText(value)}</AppText> : null}
    </View>
  );
}
