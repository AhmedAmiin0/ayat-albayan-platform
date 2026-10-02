import { I18nManager, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';

export interface PeriodSwitcherProps {
  /** «3 أكتوبر – 9 أكتوبر» or «الخميس 1 أكتوبر». */
  label: string;
  /** The shown week/day holds today: no «النهارده» jump. */
  current: boolean;
  /** «الأسبوع اللي فات» / «اليوم اللي فات»: the arrows' spoken names. */
  prevLabel: string;
  nextLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

/** ‹ label › with 44pt arrows (earlier at the inline-start, mirrored in RTL, docs/07 §14.8). */
export function PeriodSwitcher(props: PeriodSwitcherProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Arrow label={props.prevLabel} glyph="‹" onPress={props.onPrev} />
      <AppText
        accessibilityRole="header"
        style={{
          flex: 1,
          textAlign: 'center',
          fontFamily: type.ui[600],
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.ink,
          fontVariant: ['tabular-nums'],
        }}
      >
        {props.label}
      </AppText>
      {props.current ? null : (
        <Pressable
          accessibilityRole="button"
          onPress={props.onToday}
          hitSlop={{ top: 6, bottom: 6 }}
          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: shape.radius.pill, backgroundColor: color.lapisWash }}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: 20, color: color.lapis }}>
            {t.schedule.today}
          </AppText>
        </Pressable>
      )}
      <Arrow label={props.nextLabel} glyph="›" onPress={props.onNext} />
    </View>
  );
}

function Arrow({ label, glyph, onPress }: { label: string; glyph: string; onPress: () => void }) {
  const { color } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: shape.control.touch,
        height: shape.control.touch,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.ruleInput,
        backgroundColor: pressed ? color.sunk : color.raised,
      })}
    >
      <AppText
        style={{
          fontFamily: type.ui[600],
          fontSize: type.size.h4,
          lineHeight: type.size.h4 + 4,
          color: color.ink,
          transform: [{ scaleX: I18nManager.isRTL ? -1 : 1 }],
        }}
      >
        {glyph}
      </AppText>
    </Pressable>
  );
}
