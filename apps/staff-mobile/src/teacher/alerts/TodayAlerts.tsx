import type { LessonView } from '@ab/shared';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { t, AppText, InsetGroup, type, useTheme, useMarkRead } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { AlertRow, type AlertHandlers } from './AlertRow';
import { useHomePrefs } from './home-prefs';
import { useTodayAlerts } from './use-today-alerts';

interface TodayAlertsProps {
  lessons: readonly LessonView[];
  now: Date;
  tz: string;
  onOpen: AlertHandlers['onOpen'];
  onReport: AlertHandlers['onReport'];
}

const CUSTOMIZE_HREF = '/teacher/today/customize';
const titleStyle = { fontFamily: type.ui[700], fontSize: 15, lineHeight: 24 } as const;

export function TodayAlerts({ lessons, now, tz, onOpen, onReport }: TodayAlertsProps) {
  const { color } = useTheme();
  const rows = useTodayAlerts({ lessons, now, tz });
  const compact = useHomePrefs().density === 'compact';
  const read = useMarkRead();
  const h: AlertHandlers = { onOpen, onReport, onRead: (id) => read.mutate([id]) };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <AppText accessibilityRole="header" style={{ ...titleStyle, flex: 1, color: color.ink }}>
          {t.teacherAlerts.title}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(CUSTOMIZE_HREF)}
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 }}
        >
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.lapis }}>
            {t.teacherAlerts.customize}
          </AppText>
        </Pressable>
      </View>
      {rows.length === 0 ? (
        <Note>{t.teacherAlerts.empty}</Note>
      ) : (
        <InsetGroup testID="today-alerts">
          {rows.map((row) => (
            <AlertRow key={row.key} row={row} h={h} compact={compact} />
          ))}
        </InsetGroup>
      )}
    </View>
  );
}
