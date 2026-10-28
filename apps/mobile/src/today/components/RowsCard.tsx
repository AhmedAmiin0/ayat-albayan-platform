import { Fragment } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { raisedCard } from '@/core/ui/surface/surface';
import type { TodayLesson } from '../lib/today-lesson';
import { LessonRow } from './LessonRow';

interface RowsCardProps<L extends TodayLesson> {
  lessons: readonly L[];
  onOpen: (lesson: L) => void;
  compact?: boolean;
}

/** Lesson rows in ONE raised card (docs/29 §4): radius 20, 16pt sides, a 1pt rule between rows. */
export function RowsCard<L extends TodayLesson>({ lessons, onOpen, compact = false }: RowsCardProps<L>) {
  const { color } = useTheme();
  if (lessons.length === 0) return null;
  return (
    <View style={{ ...raisedCard(color), paddingHorizontal: 16 }}>
      {lessons.map((lesson, i) => (
        <Fragment key={lesson.id}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: color.rule }} /> : null}
          <LessonRow lesson={lesson} onOpen={onOpen} compact={compact} />
        </Fragment>
      ))}
    </View>
  );
}
