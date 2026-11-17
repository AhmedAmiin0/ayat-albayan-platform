import { View } from 'react-native';
import { t, AppText, type, useTheme } from '@ab/mobile-kit';
import { RoundButton } from '@/inbox';
import { ChatIcon } from './room-icons';

const C = t.mobileRoom.controls;

interface ChatButtonProps {
  unread: number;
  onPress: () => void;
}

/**
 * «المحادثة» with the student channel's unread count on its corner (canvas RoomXChat): a green
 * badge ringed in the room's cover colour; the count is in the spoken name too.
 */
export function ChatButton({ unread, onPress }: ChatButtonProps) {
  const { color } = useTheme();
  const spoken = unread > 0 ? t.portal.app.child.chatUnread.replace('{n}', String(unread)) : C.chat;
  return (
    <View>
      <RoundButton
        label={C.chat}
        accessibilityLabel={spoken}
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
            minWidth: 22,
            paddingHorizontal: 5,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: color.cover,
            overflow: 'hidden',
            textAlign: 'center',
            fontFamily: type.ui[700],
            fontSize: type.size.xs,
            color: color.onLapis,
            backgroundColor: color.lapisFill,
          }}
        >
          {String(unread)}
        </AppText>
      ) : null}
    </View>
  );
}
