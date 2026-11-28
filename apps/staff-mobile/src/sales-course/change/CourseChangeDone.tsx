import type { CourseChangeResult } from '@ab/shared';
import { View } from 'react-native';
import { t, AppText, Button, NuqtaGlyph, type, useTheme } from '@ab/mobile-kit';
import { localDay } from '@/core/lib/money/format';

interface CourseChangeDoneProps {
  result: CourseChangeResult;
  onDone: () => void;
  lines?: readonly string[] | undefined;
}

export function CourseChangeDone({ result, onDone, lines = [] }: CourseChangeDoneProps) {
  const { color } = useTheme();
  const line = {
    fontFamily: type.ui[500],
    fontSize: type.size.body,
    lineHeight: type.lineHeight(type.size.body),
    color: color.ink,
  };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{
            fontFamily: type.display,
            fontSize: type.size.h2,
            lineHeight: type.lineHeight(type.size.h2, true),
            color: color.ink,
          }}
        >
          {t.booking.courseChange.done}
        </AppText>
      </View>
      {lines.map((text) => (
        <AppText key={text} style={line}>
          {text}
        </AppText>
      ))}
      {result.endsOn ? (
        <AppText style={line}>
          {t.booking.courseChange.newEnd.replace('{date}', localDay(result.endsOn))}
        </AppText>
      ) : null}
      <Button label={t.salesMoney.done} onPress={onDone} />
    </View>
  );
}
