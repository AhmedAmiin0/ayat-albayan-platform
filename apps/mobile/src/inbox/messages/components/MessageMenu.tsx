import type { MessageView } from '@ab/shared';
import { Modal, Platform, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { shape, type, useTheme } from '@/theme';
import { ContentText } from '@/core/ui/primitives/ContentText';
import { Button } from '@/core/ui/primitives/Button';
import { useChatActions } from '../../thread/hooks/chat-actions';
import { quoteOf, quoteText } from '../hooks/quote-text';
import { bubbleOffers, downloadLabel } from '../hooks/bubble-offers';
import { copyText, downloadFile, downloadProblem } from '../copy-download/chat-tools';
import { useThreadMode } from '../../thread/hooks/thread-mode';
import { ReactionBar } from '../reactions/ReactionBar';

/** iOS presents one modal at a time: the forward sheet waits for this menu to finish closing. */
const AFTER_MENU_MS = Platform.OS === 'ios' ? 350 : 0;

interface MessageMenuProps {
  /** The long-pressed message; null hides the menu. */
  message: MessageView | null;
  /** The chat's number: «تنزيل» asks this chat's file endpoint. */
  phone: string;
  /** The held bubble's window y. Unused for now: the reaction row sits at the top of the sheet (review of #332). */
  at: number | null;
  onClose: () => void;
  /** «+» on the reaction row: the emoji sheet for this message. */
  onMoreEmoji: (m: MessageView) => void;
}

/**
 * A long press on a bubble, at the bottom of the screen as the attach sheet, in WhatsApp's order: «رد»,
 * «نسخ النص» (the copy sheet), «إعادة توجيه», «تنزيل» (owner 2026-10-26). «رد» stays visible but off
 * after the 24 h window (only a template can go then), with the reason under it.
 */
export function MessageMenu({ message: m, phone, onClose, onMoreEmoji }: MessageMenuProps) {
  const { color } = useTheme();
  const { enabled, canSend, setReply, openForward, showCopy, say, reactable, react } = useChatActions();
  const teacher = useThreadMode().kind === 'teacher';
  const offers = m ? bubbleOffers(m, { enabled, teacher, react: reactable(m) }) : null;
  const reply = offers?.reply === true;
  const forward = offers?.forward === true;
  // After the menu has closed (iOS shows one modal at a time).
  const later = (run: () => void) => {
    onClose();
    setTimeout(run, AFTER_MENU_MS);
  };
  // «تفاعل» (owner 2026-10-27): WhatsApp's row of emoji; one tap reacts and closes. At the top of the sheet,
  // never floating over the bubble: a low bubble (the newest) put the floating row under the sheet.
  const bar = m && offers?.react ? (
    <ReactionBar message={m} top={null} onReact={(e) => {
        onClose();
        react(m, e);
      }} onMore={() => later(() => onMoreEmoji(m))} />
  ) : null;
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
          {bar}
          {m ? (
            <ContentText
              source={quoteText(quoteOf(m))}
              numberOfLines={2}
              style={{ fontFamily: type.ui[400], fontSize: type.size.sm, color: color.ink2 }}
            >
              {quoteText(quoteOf(m))}
            </ContentText>
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
          {m && offers?.copy ? (
            <Button
              variant="secondary"
              label={t.inbox.copy.text}
              accessibilityLabel={t.inbox.copy.label}
              onPress={() => later(() => copyText({ title: t.inbox.copy.label, text: m.body ?? '' }, showCopy))}
            />
          ) : null}
          {m && forward ? (
            <Button
              variant="secondary"
              label={t.inbox.forward.action}
              onPress={() => later(() => openForward(m))}
            />
          ) : null}
          {m && offers?.download ? (
            <Button
              variant="secondary"
              label={t.inbox.download.action}
              accessibilityLabel={downloadLabel(m)}
              onPress={() => {
                onClose();
                downloadFile({ phone, messageId: m.id }).catch((e: unknown) => say({ text: downloadProblem(e) }));
              }}
            />
          ) : null}
          <Button variant="secondary" label={t.common.cancel} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}
