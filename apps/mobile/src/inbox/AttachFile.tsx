import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { requestId } from '@/core/lib/http/request-id';
import { shape, useTheme } from '@/theme';
import { Button } from '@/core/ui/primitives/Button';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { useChatActions } from './chat-actions';
import { AttachIcon } from './chat-icons';
import { type ChatFileSource, fileError, pickChatFile, useSendFile } from './send-file';
import { useThreadMode } from './thread-mode';

interface SheetProps {
  visible: boolean;
  onPick: (source: ChatFileSource) => void;
  onClose: () => void;
}

/** «أرفق صورة» / «أرفق ملف PDF» at the bottom of the screen; a tap outside closes it. */
function AttachSheet({ visible, onPick, onClose }: SheetProps) {
  const { color } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.common.cancel}
        onPress={onClose}
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: color.scrim }}
      >
        {/* A tap on the sheet itself does not close it. */}
        <View
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
          <Button variant="secondary" label={t.inbox.composer.attachImage} onPress={() => onPick('image')} />
          <Button variant="secondary" label={t.inbox.composer.attachPdf} onPress={() => onPick('pdf')} />
          <Button variant="ghost" label={t.common.cancel} onPress={onClose} />
        </View>
      </Pressable>
    </Modal>
  );
}

export interface AttachFileProps {
  phone: string;
  /** Why the file did not go (inbox.error.<code>), or null when a new pick starts. */
  onError: (message: string | null) => void;
}

/**
 * The paperclip of the open-window row (owner 2026-10-19 #1/#2): a photo or a PDF goes to the family
 * as her message. Never in teacher mode (teachers do not send files: the API answers 403
 * files_forbidden); the composer shows it only while the 24 h window is open. Each picked file gets
 * its own clientRequestId: the dedup namespace is shared with text sends.
 */
export function AttachFile({ phone, onError }: AttachFileProps) {
  const { color } = useTheme();
  const teacher = useThreadMode().kind === 'teacher';
  const maxBytes = useUploadMaxBytes();
  const send = useSendFile(phone);
  const { reply, setReply } = useChatActions();
  const [choosing, setChoosing] = useState(false);
  if (teacher) return null;

  const pick = async (source: ChatFileSource) => {
    setChoosing(false);
    onError(null);
    try {
      const file = await pickChatFile(source, maxBytes);
      if (!file) return;
      // An answer (the composer's quote strip): sent, it clears; refused, it stays for another try.
      const to = reply?.id;
      await send.mutateAsync({ phone, file, id: requestId(), maxBytes, ...(to ? { replyToMessageId: to } : {}) });
      if (to) setReply((now) => (now?.id === to ? null : now));
    } catch (e) {
      onError(fileError(e));
    }
  };

  return (
    <>
      <IconButton label={t.inbox.composer.attach} disabled={send.isPending} onPress={() => setChoosing(true)}>
        <AttachIcon color={color.lapis} />
      </IconButton>
      <AttachSheet visible={choosing} onPick={(source) => void pick(source)} onClose={() => setChoosing(false)} />
    </>
  );
}
