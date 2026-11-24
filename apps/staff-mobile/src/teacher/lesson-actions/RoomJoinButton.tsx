import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom';
import { t, Button, type ButtonVariant, ErrorLine } from '@ab/mobile-kit';

interface RoomJoinButtonProps {
  lesson: LessonView;
  variant: ButtonVariant;
}

/** Filled as the live lead, outlined after the end when the report leads (docs/48). */
export function RoomJoinButton({ lesson, variant }: RoomJoinButtonProps) {
  const join = useJoinClassroom(lesson);
  return (
    <View style={{ gap: 2, alignSelf: 'stretch' }}>
      <Button
        variant={variant}
        label={join.busy ? t.classroom.joining : t.classroom.enter}
        accessibilityLabel={t.classroom.enter}
        busy={join.busy}
        onPress={() => void join.join()}
      />
      {join.error ? <ErrorLine message={join.error} /> : null}
    </View>
  );
}
