import type { LessonView } from '@ab/shared';
import { View } from 'react-native';
import { useJoinClassroom } from '@/classroom';
import { t } from '@/core/lib/i18n/i18n';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Button, type ButtonVariant } from '@/core/ui/primitives/Button';

interface RoomJoinButtonProps {
  lesson: LessonView;
  variant: ButtonVariant;
}

/**
 * «ادخل الحلقة» into our classroom in the variant the plan gives it: filled as the live lead,
 * outlined as a peer after the end (docs/48: the report leads then). The press is
 * useJoinClassroom's (the API first, then the room), with its busy line and refusal.
 */
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
