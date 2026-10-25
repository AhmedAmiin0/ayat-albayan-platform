import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { warnLine } from './trial-date-text';

/**
 * From the 3rd date on (warnsTrialDate): «سيكون هذا الموعد التجريبي رقم {n}…» as a hamish line in
 * act, like the package/days note: a warning to check with the guardian, never a block.
 */
export function TrialDateWarn({ count }: { count: number }) {
  const { color } = useTheme();
  const line = warnLine(count);
  if (!line) return null;
  return (
    <View testID="trial-date-warn" style={{ borderStartWidth: 3, borderStartColor: color.goldSoft, paddingStart: 10 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.act }}>
        {line}
      </AppText>
    </View>
  );
}
