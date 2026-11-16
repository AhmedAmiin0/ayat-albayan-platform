import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t, AppText, shape, type, useTheme } from '@ab/mobile-kit';
import { PillButton } from '@/core/ui/primitives/PillButton';

interface RoomTopBarProps {
  title: string;
  /** In the room: «المشاركون · 3», which opens the participants panel. */
  people?: { count: number; open: () => void } | null;
  /** «جارٍ التسجيل»: the in-room recording notice (canvas RoomXTeacher). */
  recording: boolean;
  onBrowser: () => void;
}

/** «جارٍ التسجيل»: a small red-edged pill. */
function RecordingPill() {
  const { color } = useTheme();
  return (
    <AppText
      testID="room-recording"
      accessibilityLiveRegion="polite"
      style={{
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        borderRadius: shape.radius.pill,
        borderWidth: 1,
        borderColor: color.badSolid,
        fontSize: type.size.xs,
        color: color.coverInk,
      }}
    >
      {t.classroom.recordingNow}
    </AppText>
  );
}

/** The room's header: its name, the recording notice, the participants, «فتح في المتصفح». */
export function RoomTopBar({ title, people, recording, onBrowser }: RoomTopBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <AppText
          accessibilityRole="header"
          numberOfLines={1}
          style={{ fontSize: type.size.base, color: color.coverInk }}
        >
          {title}
        </AppText>
        {recording ? <RecordingPill /> : null}
      </View>
      {people ? (
        <PillButton
          label={`${t.classroom.people} · ${people.count}`}
          accessibilityLabel={t.mobileRoom.count.replace('{n}', String(people.count))}
          onPress={people.open}
        />
      ) : null}
      <PillButton label={t.mobileRoom.openInBrowser} onPress={onBrowser} />
    </View>
  );
}
