import { View } from 'react-native';
import { AppText, t, type, useTheme } from '@ab/mobile-kit';
import type { ChildNextLineProps } from './ChildNextLine.types';
import { NextPanel, panel } from './NextPanel';
import { useChildNextLine } from './use-child-next-line';

/**
 * A child card's next lesson, or a calm «no lessons» note once the lessons are known (nothing
 * while they load, so the note never flashes before the lesson).
 */
export function ChildNextLine({ student, clock }: ChildNextLineProps) {
  const { color } = useTheme();
  const { now, lessons, next } = useChildNextLine(student.id);
  if (!lessons) return null;
  return next ? (
    <NextPanel lesson={next} clock={clock} now={now} />
  ) : (
    <View style={{ ...panel, backgroundColor: color.sunk }}>
      <AppText style={{ fontSize: type.size.sm, color: color.ink3 }}>
        {t.portal.lessonsEmpty}
      </AppText>
    </View>
  );
}
