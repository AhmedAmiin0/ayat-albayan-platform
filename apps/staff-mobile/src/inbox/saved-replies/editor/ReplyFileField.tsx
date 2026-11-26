import { useState } from 'react';
import { View } from 'react-native';
import { t, type, useTheme, AppText, Button, ErrorLine } from '@ab/mobile-kit';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { ButtonRow } from '@/core/ui/actions';
import { type ChatFileSource, pickChatFile } from '@/inbox/composer/send-file';
import { uploadReplyFile } from '@/inbox/saved-replies/hooks/api';
import { replyError } from '@/inbox/saved-replies/lib/reply-error';
import { SavedReplyChip } from '@/inbox/saved-replies/components/SavedReplyChip';

/** The editor's file: kept as it was (no path), a new upload (path), or none. */
export type EditorFile = { name: string; path?: string } | null;

interface ReplyFileFieldProps {
  file: EditorFile;
  onChange: (file: EditorFile) => void;
  /** Save waits for the upload, else the reply would be saved without its file. */
  onBusy?: (busy: boolean) => void;
}

/** Same file types and limits as the chat (pickChatFile); uploaded at once via a signed URL. */
export function ReplyFileField({ file, onChange, onBusy }: ReplyFileFieldProps) {
  const { color } = useTheme();
  const maxBytes = useUploadMaxBytes();
  const [busy, setBusyState] = useState(false);
  const setBusy = (next: boolean) => {
    setBusyState(next);
    onBusy?.(next);
  };
  const [error, setError] = useState<string | null>(null);
  const pick = async (source: ChatFileSource) => {
    setError(null);
    try {
      const picked = await pickChatFile(source, maxBytes);
      if (!picked) return;
      setBusy(true);
      const up = await uploadReplyFile(picked);
      onChange(up);
    } catch (e) {
      setError(replyError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: 6 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>
        {t.savedReplies.attachment}
      </AppText>
      {file ? (
        <SavedReplyChip file={file} onRemove={() => onChange(null)} />
      ) : busy ? (
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>
          {t.savedReplies.attachUploading}
        </AppText>
      ) : (
        <ButtonRow>
          <Button variant="secondary" label={t.inbox.composer.attachImage} onPress={() => void pick('image')} />
          <Button variant="secondary" label={t.inbox.composer.attachPdf} onPress={() => void pick('pdf')} />
        </ButtonRow>
      )}
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink2 }}>{t.savedReplies.attachHint}</AppText>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
