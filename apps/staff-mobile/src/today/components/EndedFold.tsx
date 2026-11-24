import { counted } from '@ab/core';
import { type ReactNode, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import type { TodayLesson } from '@/today/lib/today-lesson';
import { RowsCard } from './RowsCard';

interface EndedFoldProps<L extends TodayLesson> {
  lessons: readonly L[];
  onOpen: (lesson: L) => void;
  /** Open from the start under a column filter (the filtered ended lessons are in view). Read on mount. */
  open?: boolean;
  /** The unfolded rows in place of the compact RowsCard (the teacher's own rows, docs/48). */
  rows?: ReactNode;
}

/** Ended lessons fold into one row (docs/29 §5); each still opens the sheet (R-SCH-11). */
export function EndedFold<L extends TodayLesson>(props: EndedFoldProps<L>) {
  const { lessons, onOpen, open = false, rows } = props;
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
      {shown ? (rows ?? <RowsCard lessons={lessons} onOpen={onOpen} compact />) : null}
    </View>
  );
}
