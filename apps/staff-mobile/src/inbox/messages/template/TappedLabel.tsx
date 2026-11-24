import { tappedButton, type MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t, type, useTheme, AppText, ReplyIcon } from '@ab/mobile-kit';

export function TappedLabel({ message: m }: { message: MessageView }) {
  const { color } = useTheme();
  if (m.direction !== 'inbound' || !tappedButton(m.interactive_payload)) return null;
  return (
    <View testID="tapped-button" style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <ReplyIcon color={color.ink3} size={14} />
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size['2xs'], lineHeight: type.lineHeight(type.size['2xs']), color: color.ink3 }}>
        {t.inbox.templateBubble.tapped}
      </AppText>
    </View>
  );
}
