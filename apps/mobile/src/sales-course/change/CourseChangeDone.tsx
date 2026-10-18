import type { CourseChangeResult } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { localDay } from '@/payments/format';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { NuqtaGlyph } from '@/ui/NuqtaGlyph';
import { type, useTheme } from '@/theme';

/** After POST …/course/change 201: «تغيّرت أيام الحلقات», the course's new last day, and the way out. */
export function CourseChangeDone({ result, onDone }: { result: CourseChangeResult; onDone: () => void }) {
  const { color } = useTheme();
  const line = { fontFamily: type.ui[500], fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body), color: color.ink };
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <NuqtaGlyph shape="fill" color={color.ok} size={14} />
        <AppText
          accessibilityRole="alert"
          style={{ fontFamily: type.display, fontSize: type.size.h2, lineHeight: type.lineHeight(type.size.h2, true), color: color.ink }}
        >
          {t.booking.courseChange.done}
        </AppText>
      </View>
      {result.endsOn ? <AppText style={line}>{t.booking.courseChange.newEnd.replace('{date}', localDay(result.endsOn))}</AppText> : null}
      <Button label={t.salesMoney.done} onPress={onDone} />
    </View>
  );
}
