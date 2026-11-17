import { View } from 'react-native';
import { t, AppText, Ltr, shape, type, useTheme } from '@ab/mobile-kit';

/**
 * «جارٍ التسجيل · 04:12» (canvas RoomXTeacher): 24pt, the soft bad fill and bad ink, an 8pt dot,
 * bold 12; the elapsed time is a timer in an LTR island.
 */
export function RecordingPill({ elapsed }: { elapsed: string | null }) {
  const { color } = useTheme();
  const ink = { fontFamily: type.ui[700], fontSize: 12, color: color.bad };
  return (
    <View
      testID="room-recording"
      style={{
        alignSelf: 'flex-start',
        height: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        backgroundColor: color.badSoft,
      }}
    >
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color.bad }} />
      <AppText style={ink}>{t.classroom.recordingNow}</AppText>
      {elapsed ? (
        <Ltr accessibilityRole="timer" style={ink}>
          {elapsed}
        </Ltr>
      ) : null}
    </View>
  );
}
