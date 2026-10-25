import { canForward, canReply, type MessageView } from '@ab/shared';
import { Modal, Platform, Pressable, View } from 'react-native';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { useChatActions } from './chat-actions';
import { quoteOf, quoteText } from './quote-text';

/** iOS presents one modal at a time: the forward sheet waits for this menu to finish closing. */
export const AFTER_MENU_MS = Platform.OS === 'ios' ? 350 : 0;

export interface MessageMenuProps {
  /** The long-pressed message; null hides the menu. */
  message: MessageView | null;
  onClose: () => void;
}

/**
 * A long press on a bubble: «رد» and «إعادة توجيه» at the bottom of the screen, as the attach sheet. «رد»
 * stays visible but off after the 24 h window (only a template can go then), with the reason under it.
 */
export function MessageMenu({ message: m, onClose }: MessageMenuProps) {
  const { color } = useTheme();
  const { canSend, setReply, openForward } = useChatActions();
  const reply = m !== null && canReply(m);
  const forward = m !== null && canForward(m);
  return (
    <Modal visible={m !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        {/* A tap on the sheet itself does not close it. */}
        <View
          testID="message-menu"
          accessibilityLabel={t.inbox.reply.menu}
          onStartShouldSetResponder={() => true}
          style={{
            gap: 8,
            padding: 16,
            paddingBottom: 32,
            borderTopLeftRadius: shape.radius.lg,
            borderTopRightRadius: shape.radius.lg,
            backgroundColor: color.raised,
          }}
        >
          {m ? (
            <AppText
              numberOfLines={2}
              style={{
                fontFamily: type.ui[400],
                fontSize: type.size.sm,
                color: color.ink2,
                writingDirection: 'auto',
              }}
            >
              {quoteText(quoteOf(m))}
            </AppText>
          ) : null}
          {reply ? (
            <Button
              variant="secondary"
              label={t.inbox.reply.action}
              disabled={!canSend}
              onPress={() => {
                setReply(m);
                onClose();
              }}
            />
          ) : null}
          {reply && !canSend ? <Note>{t.inbox.sessionClosed}</Note> : null}
          {forward ? (
            <Button
              variant="secondary"
              label={t.inbox.forward.action}
              onPress={() => {
                onClose();
                setTimeout(() => openForward(m), AFTER_MENU_MS);
              }}
            />
          ) : null}
          <Button variant="ghost" label={t.common.cancel} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
