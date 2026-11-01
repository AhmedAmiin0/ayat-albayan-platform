import type { SubscriptionView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { FormLabel } from '@/payments/FormLabel';
import { packageFrom, paidOf } from '@/core/lib/money/format';

interface PackagePickerProps {
  /** payablePackages: more than one only when an older package is still owed money. */
  packages: SubscriptionView[];
  value: SubscriptionView;
  onChange: (subscriptionId: string) => void;
}

/** «الاشتراك»: which package the money is for, and how much of its price is already paid. */
export function PackagePicker({ packages, value, onChange }: PackagePickerProps) {
  const { color } = useTheme();
  const line = (weight: 500 | 600, ink: string) => ({
    fontFamily: type.ui[weight],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: ink,
    fontVariant: ['tabular-nums' as const],
  });
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{t.payments.subscription}</FormLabel>
      {packages.length > 1 ? (
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.payments.mobile.chooseSubscription}
          items={packages.map((p) => ({ value: p.id, label: packageFrom(p) }))}
          value={value.id}
          onChange={onChange}
        />
      ) : (
        <AppText style={line(600, color.ink)}>{packageFrom(value)}</AppText>
      )}
      <AppText style={line(500, color.ink2)}>{paidOf(value)}</AppText>
    </View>
  );
}
