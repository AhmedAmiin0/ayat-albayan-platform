import { View } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { RoundButton } from '@/inbox';
import { ChatIcon } from './room-icons';

const C = t.mobileRoom.controls;

interface ChatButtonProps {
  unread: number;
  onPress: () => void;
}

/** «المحادثة» with the student channel's unread count on its corner (canvas RoomXChat). */
export function ChatButton({ unread, onPress }: ChatButtonProps) {
  const { color } = useTheme();
  return (
    <View>
      <RoundButton
        label={C.chat}
        tone="plain"
        onPress={onPress}
        icon={(ink) => <ChatIcon color={ink} />}
      />
      {unread > 0 ? (
        <AppText
          testID="room-chat-unread"
          importantForAccessibility="no"
          accessibilityElementsHidden
          style={{
            position: 'absolute',
            top: -2,
            end: 6,
            minWidth: 20,
            paddingHorizontal: 5,
            borderRadius: 10,
            overflow: 'hidden',
            textAlign: 'center',
            fontFamily: type.ui[700],
            fontSize: type.size.xs,
            color: color.onBad,
            backgroundColor: color.badSolid,
          }}
        >
          {String(unread)}
        </AppText>
      ) : null}
    </View>
  );
}
