import { clockTime, RIYADH_TZ } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * «دلوقتي 15:20» (docs/07 §12): a 2pt ink line with an ink pill over the time column. Ink, not
 * saffron: now is not an action.
 */
export function NowLine({ now }: { now: Date }) {
  const { color } = useTheme();
  const label = `${t.today.now} ${clockTime(now, RIYADH_TZ)}`;
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 6 }}
    >
      <View style={{ flex: 1, height: 2, backgroundColor: color.ink }} />
      <View
        style={{
          paddingHorizontal: 10,
          borderRadius: shape.radius.pill,
          backgroundColor: color.ink,
        }}
      >
        <AppText
          style={{
            fontFamily: type.ui[700],
            fontSize: type.size['2xs'],
            lineHeight: 22,
            color: color.margin,
            fontVariant: ['tabular-nums'],
          }}
        >
          {label}
        </AppText>
      </View>
    </View>
  );
}
