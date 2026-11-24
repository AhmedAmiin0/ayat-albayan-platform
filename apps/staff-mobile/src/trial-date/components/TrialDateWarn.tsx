import { View } from 'react-native';
import { type, useTheme, AppText } from '@ab/mobile-kit';
import { warnLine } from '@/trial-date/lib/trial-date-text';

/** From the 3rd date on, a warning to check with the guardian, never a block. */
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
