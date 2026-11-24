import type { CourseCardView } from '@ab/shared';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { shape, useTheme } from '@ab/mobile-kit';
import { CourseSummary } from './CourseSummary';
import { UpcomingList } from './UpcomingList';

interface CardBoxProps {
  card: CourseCardView | undefined;
  /** Absent means the card's own list once a course is booked. */
  upcoming?: ReactNode;
}

export function CardBox({ card, upcoming }: CardBoxProps) {
  const { color } = useTheme();
  const booked = card?.course != null;
  const list = upcoming ?? (card && booked ? <UpcomingList lessons={card.upcoming} /> : null);
  if (!card && !upcoming) return null;
  return (
    <View
      style={{
        gap: 12,
        padding: 12,
        borderRadius: shape.radius.lg,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.raised,
      }}
    >
      {card ? <CourseSummary card={card} /> : null}
      {list}
    </View>
  );
}
