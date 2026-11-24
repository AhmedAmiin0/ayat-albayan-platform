import { View } from 'react-native';
import { t, AppText, Button, shape, type, useTheme } from '@ab/mobile-kit';

export interface ConflictNoticeProps {
  /** One Arabic line per clash (booking.conflict.<kind>). */
  lines: readonly string[];
  /** Back to freshly fetched free slots; none means the times are already on screen. */
  onChangeSlot?: (() => void) | undefined;
}

/** R-SCH-04, B3: mobile has no override; a reason-backed override stays on the web. */
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
      {onChangeSlot ? <Button label={t.booking.changeSlot} onPress={onChangeSlot} /> : null}
    </View>
  );
}
