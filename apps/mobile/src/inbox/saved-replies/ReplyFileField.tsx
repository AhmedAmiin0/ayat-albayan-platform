import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useUploadMaxBytes } from '@/core/lib/query/public-config';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { ErrorLine } from '../ErrorLine';
import { type ChatFileSource, pickChatFile } from '../composer/send-file';
import { uploadReplyFile } from './api';
import { replyError } from './reply-error';
import { SavedReplyChip } from './SavedReplyChip';

/** The editor's file: kept as it was (no path), a new upload (path), or none. */
export type EditorFile = { name: string; path?: string } | null;

export interface ReplyFileFieldProps {
  file: EditorFile;
  onChange: (file: EditorFile) => void;
  /** An upload is running: the editor's «حفظ» waits for it (else the reply is saved without its file). */
  onBusy?: (busy: boolean) => void;
}

/**
 * «المرفق (اختياري)»: a photo or a PDF picked as in the chat (pickChatFile: same types and limits),
 * uploaded at once through the signed URL; the chip removes it. Saved with the reply.
 */
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
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, color: color.ink2 }}>{t.savedReplies.attachment}</AppText>
      {file ? (
        <SavedReplyChip file={file} onRemove={() => onChange(null)} />
      ) : busy ? (
        <AppText style={{ fontSize: type.size.sm, color: color.ink2 }}>{t.savedReplies.attachUploading}</AppText>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button variant="secondary" label={t.inbox.composer.attachImage} onPress={() => void pick('image')} />
          <Button variant="secondary" label={t.inbox.composer.attachPdf} onPress={() => void pick('pdf')} />
        </View>
      )}
      <AppText style={{ fontSize: type.size['2xs'], color: color.ink2 }}>{t.savedReplies.attachHint}</AppText>
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
