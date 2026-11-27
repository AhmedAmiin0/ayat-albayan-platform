import { View } from 'react-native';
import { AppText, t, type } from '@ab/mobile-kit';
import { JoinButton } from '@/lessons/JoinButton';
import type { JoinNowProps } from './JoinNow.types';
import { useJoinNow } from './use-join-now';

/** The button inside the window, and why the room did not open when it failed. */
export function JoinNow({ lesson, studentId, short, live, ink }: JoinNowProps) {
  const { busy, failed, onJoin } = useJoinNow({ lesson, studentId });
  return (
    <View style={{ gap: 6 }}>
      <JoinButton short={short} live={live} busy={busy} onPress={onJoin} />
      {failed ? (
        <AppText accessibilityRole="alert" style={{ fontSize: type.size.xs, color: ink }}>
          {t.portal.app.lesson.joinFailed}
        </AppText>
      ) : null}
    </View>
  );
}
