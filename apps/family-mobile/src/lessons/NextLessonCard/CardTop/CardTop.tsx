import { isLessonNow, windowStateAt } from '@ab/client-core';
import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import { SOFT_INK } from '@/lessons/CardFooter';
import { whenText } from '@/lessons/lesson-text';
import { LessonChip } from '@/lessons/options/LessonChip';
import type { CardTopProps } from './CardTop.types';

export function CardTop({ lesson, clock, now, full, own }: CardTopProps) {
  const { color } = useTheme();
  const A = t.portal.app.lesson;
  const words = { color: color.onLapis, fontSize: type.size.xs };
  const open = windowStateAt(lesson.window, now) === 'open' || isLessonNow(lesson, now);
  const title = own ? A.nextLessonSelf : t.portal.nextLesson;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <AppText style={{ ...words, flexShrink: 1, opacity: SOFT_INK }}>
        {`${title} · ${whenText(new Date(lesson.starts_at), clock, now)}`}
      </AppText>
      {open && full ? (
        <AppText style={{ ...words, fontFamily: type.ui[600] }}>{A.openNow}</AppText>
      ) : (
        <LessonChip lesson={lesson} />
      )}
    </View>
  );
}
