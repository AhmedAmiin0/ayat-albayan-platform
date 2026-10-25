import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { shape, type, useTheme } from '@/theme';

export interface ConflictNoticeProps {
  /** One Arabic line per clash (booking.conflict.<kind>). */
  lines: readonly string[];
  /** «اختار ميعاد تاني»: back to the free slots, fetched afresh. */
  onChangeSlot: () => void;
}

/**
 * 409 conflict (R-SCH-04, issue B3): the slot was taken between listing and booking. Mobile has no
 * «احجز رغم التعارض»; the way out is another slot (an override with a reason stays on the web).
 */
export function ConflictNotice({ lines, onChangeSlot }: ConflictNoticeProps) {
  const { color } = useTheme();
  const text = {
    fontFamily: type.ui[500],
    fontSize: type.size.sm,
    lineHeight: type.lineHeight(type.size.sm),
    color: color.ink,
  };
  return (
    <View
      style={{ gap: 8, padding: 14, borderRadius: shape.radius.md, backgroundColor: color.badSoft }}
    >
      <AppText
        accessibilityRole="alert"
        style={{ ...text, fontFamily: type.ui[600], color: color.bad }}
      >
        {t.booking.conflictTitle}
      </AppText>
      {lines.map((line) => (
        <AppText key={line} style={text}>
          {line}
        </AppText>
      ))}
      <Button label={t.booking.changeSlot} onPress={onChangeSlot} />
    </View>
  );
}
