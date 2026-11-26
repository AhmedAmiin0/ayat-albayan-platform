import { Pressable, View } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import type { TodayLesson } from '@/today/lib/today-lesson';
import { RowsCard } from './RowsCard';

interface RestSectionProps<L extends TodayLesson> {
  lessons: readonly L[];
  onOpen: (lesson: L) => void;
  onShowAll: () => void;
}

/** Nothing when none is left (docs/29 §4). */
export function RestSection<L extends TodayLesson>({
  lessons,
  onOpen,
  onShowAll,
}: RestSectionProps<L>) {
  const { color } = useTheme();
  if (lessons.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText
          accessibilityRole="header"
          style={{ fontFamily: type.ui[700], fontSize: 15, lineHeight: 24, color: color.ink, fontVariant: ['tabular-nums'] }}
        >
          {t.today.rest.replace('{n}', String(lessons.length))}
        </AppText>
        <Pressable
          accessibilityRole="button"
          onPress={onShowAll}
          hitSlop={8}
          style={({ pressed }) => ({ minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'flex-end', opacity: pressed ? 0.6 : 1 })}
        >
          <AppText
            style={{
              fontFamily: type.ui[600],
              fontSize: type.size.sm,
              lineHeight: 22,
              color: color.lapis,
            }}
          >
            {t.today.all}
          </AppText>
        </Pressable>
      </View>
      <RowsCard lessons={lessons} onOpen={onOpen} />
    </View>
  );
}
