import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { TodayLesson } from '../lib/today-lesson';
import { RowsCard } from './RowsCard';

interface RestSectionProps<L extends TodayLesson> {
  lessons: readonly L[];
  onOpen: (lesson: L) => void;
  /** «الكل»: back to every lesson of the day. */
  onShowAll: () => void;
}

/** «بقية اليوم · N» with «الكل» at the end, then the rows (docs/29 §4). Nothing when none is left. */
export function RestSection<L extends TodayLesson>({ lessons, onOpen, onShowAll }: RestSectionProps<L>) {
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
          <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, lineHeight: 22, color: color.lapis }}>
            {t.today.all}
          </AppText>
        </Pressable>
      </View>
      <RowsCard lessons={lessons} onOpen={onOpen} />
    </View>
  );
}
