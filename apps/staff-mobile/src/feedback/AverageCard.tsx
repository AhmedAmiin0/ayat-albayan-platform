import { View } from 'react-native';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { averageLine, recommendLine } from './feedback-text';
import type { FeedbackAverage } from './types';

/** Shows nothing before the first answer. */
export function AverageCard({ name, average }: { name: string | null; average: FeedbackAverage | null }) {
  const { color } = useTheme();
  const rating = averageLine(average);
  const yes = recommendLine(average);
  return (
    <View
      accessibilityLabel={name ?? t.mobile.feedback.average}
      style={{ gap: 2, padding: 12, borderRadius: shape.radius.md, backgroundColor: color.sunk }}
    >
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.sm, color: color.ink }}>
        {name ?? t.mobile.feedback.average}
      </AppText>
      <AppText style={{ fontFamily: type.ui[700], fontSize: type.size.base, color: color.ink, fontVariant: ['tabular-nums'] }}>
        {rating ?? t.mobile.feedback.empty}
      </AppText>
      {yes ? <Note>{yes}</Note> : null}
    </View>
  );
}
