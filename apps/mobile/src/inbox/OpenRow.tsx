import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { IconButton } from '@/core/ui/primitives/IconButton';
import { AttachFile } from './composer/AttachFile';
import { SendIcon, TemplateIcon } from './shared/chat-icons';
import { ComposerInput } from './composer/ComposerInput';
import { SavedRepliesButton } from './saved-replies/SavedRepliesButton';

export interface OpenRowProps {
  phone: string;
  text: string;
  onText: (text: string) => void;
  /** Staff (not a teacher): «الردود السريعة» in the row. */
  staff: boolean;
  onTemplate: () => void;
  onReplies: () => void;
  onFileError: (message: string | null) => void;
  onSend: () => void;
  /** The text or a staged file is on its way: one «أرسل» at a time. */
  sending: boolean;
}

/** The open window's one row: [template] [replies] [file] [text] [send], each icon 44pt. */
export function OpenRow(p: OpenRowProps) {
  const { color } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      <IconButton label={t.inbox.composer.sendTemplate} onPress={p.onTemplate}>
        <TemplateIcon color={color.lapis} />
      </IconButton>
      {p.staff ? <SavedRepliesButton open onPress={p.onReplies} /> : null}
      <AttachFile phone={p.phone} onError={p.onFileError} />
      <ComposerInput value={p.text} onChange={p.onText} />
      <IconButton variant="filled" label={t.inbox.composer.send} disabled={p.sending} onPress={p.onSend}>
        <SendIcon color={color.onLapis} />
      </IconButton>
    </View>
  );
}
