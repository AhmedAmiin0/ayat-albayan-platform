import { counted } from '@ab/shared';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { type, useTheme } from '@/theme';
import type { TodayLesson } from '../lib/today-lesson';
import { RowsCard } from './RowsCard';

interface EndedFoldProps<L extends TodayLesson> {
  lessons: readonly L[];
  onOpen: (lesson: L) => void;
  /** Open from the start under a column filter (the filtered ended lessons are in view). Read on mount. */
  open?: boolean;
}

/**
 * The day's ended lessons as one quiet row «انتهت 3 حلقات اليوم» (docs/29 §5); a tap unfolds them as
 * compact rows, each still opening the tree's sheet («عدّل الوقت» for the admin, R-SCH-11).
 */
export function EndedFold<L extends TodayLesson>({ lessons, onOpen, open = false }: EndedFoldProps<L>) {
  const { color } = useTheme();
  const [expanded, setExpanded] = useState(open);
  if (lessons.length === 0) return null;
  const shown = expanded;
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        onPress={() => setExpanded(!shown)}
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 4,
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <AppText style={{ fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: 22, color: color.ink3 }}>
          {counted(t.today.endedFold, lessons.length)}
        </AppText>
        <Svg
          width={18}
          height={18}
          viewBox="0 0 24 24"
          style={{ transform: [{ rotate: shown ? '180deg' : '0deg' }] }}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Path d="M6 9l6 6 6-6" fill="none" stroke={color.ink3} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      {shown ? <RowsCard lessons={lessons} onOpen={onOpen} compact /> : null}
    </View>
  );
}
