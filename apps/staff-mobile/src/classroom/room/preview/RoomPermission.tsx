import { View } from 'react-native';
import { t, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import { CameraIcon, MicIcon } from '@/inbox';

const P = t.mobileRoom.permission;

interface RoomPermissionProps {
  onAllow: () => void;
  onSkip: () => void;
}

/**
 * Before the system dialog: why the room needs the camera and the microphone, in MSA (docs/35 §3).
 */
export function RoomPermission({ onAllow, onSkip }: RoomPermissionProps) {
  const { color } = useTheme();
  return (
    <View
      testID="room-permission"
      style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 16 }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
        <MicIcon color={color.coverInk} size={32} />
        <CameraIcon color={color.coverInk} size={32} />
      </View>
      <AppText
        accessibilityRole="header"
        style={{ textAlign: 'center', fontSize: type.size.h4, color: color.coverInk }}
      >
        {P.title}
      </AppText>
      <AppText
        style={{
          textAlign: 'center',
          fontSize: type.size.body,
          lineHeight: type.lineHeight(type.size.body),
          color: color.coverInk,
        }}
      >
        {P.body}
      </AppText>
      <Button label={P.allow} onPress={onAllow} />
      <Button label={P.skip} variant="secondary" onPress={onSkip} />
    </View>
  );
}
