import { tappedButton, type MessageView } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { ReplyIcon } from '../../shared/chat-icons';

/** Theirs, from a tap on a template button: a small «ضغطة زرّ» mark over the tapped label (the body). */
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
