import type { LessonView } from '@ab/shared';
import { Fragment } from 'react';
import { View } from 'react-native';
import { useTheme } from '@/theme';
import { raisedCard } from '../lib/surface';
import { LessonRow } from './LessonRow';

interface RowsCardProps {
  lessons: readonly LessonView[];
  onOpen: (lesson: LessonView) => void;
  compact?: boolean;
}

/** Lesson rows in ONE raised card (docs/29 §4): radius 20, 16pt sides, a 1pt rule between rows. */
export function RowsCard({ lessons, onOpen, compact = false }: RowsCardProps) {
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
